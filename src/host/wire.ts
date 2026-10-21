/**
 * Wire helpers for this plugin's JSON API: bounded body reading, response
 * writing, and the shared error envelope.
 *
 * Every method answers `{ok: true, value}` on success and
 * `{ok: false, error: {code, message}}` on failure, with the HTTP status
 * matching the code. The envelope is the same shape dsh-better-sidebar uses
 * for its own `/sidebar/api/*`, so the client half reads one error format
 * whichever route it called.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ApiError } from '../shared/types.ts'

/** Machine-readable failure codes of this plugin's API. */
export type ApiErrorCode =
  | 'bad-request'
  | 'not-found'
  | 'forbidden'
  | 'method-error'
  | 'too-large'
  | 'unavailable'
  | 'data-corrupt'
  | 'data-too-large'
  | 'internal'

/** One API failure with its wire code and HTTP status. */
export class ApiFailure extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

/**
 * Body size bound of one JSON request.
 *
 * The data file may hold 8 MiB, so the request bound has to be generous
 * enough to carry a whole note set back to the host — but not unbounded: a
 * request body is read into memory.
 */
export const MAX_BODY_BYTES = 16 * 1024 * 1024

/** The success envelope. */
export interface ApiOk<T> {
  ok: true
  value: T
}

/** The failure envelope. */
export interface ApiErr {
  ok: false
  error: ApiError
}

/** Read and parse the JSON request body (bounded; malformed → bad-request). */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > MAX_BODY_BYTES) {
      throw new ApiFailure('too-large', 'request body too large', 413)
    }
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim() === '') return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiFailure('bad-request', 'request body is not valid JSON')
  }
}

/** Write a JSON response. */
export function writeJson(res: ServerResponse, status: number, body: unknown): void {
  // The response may already be committed: `writeHead` would then throw
  // ERR_HTTP_HEADERS_SENT. There is nothing left to say to the client once
  // the status line is out — tear the socket down instead.
  if (res.headersSent) {
    res.destroy()
    return
  }
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

/** Write the success envelope. */
export function writeOk(res: ServerResponse, value: unknown): void {
  writeJson(res, 200, { ok: true, value } satisfies ApiOk<unknown>)
}

/** Write the failure envelope for any thrown value (unknown → internal 500). */
export function writeError(res: ServerResponse, error: unknown): void {
  if (error instanceof ApiFailure) {
    writeJson(res, error.status, {
      ok: false,
      error: { code: error.code, message: error.message },
    } satisfies ApiErr)
    return
  }
  const message = error instanceof Error ? error.message : String(error)
  writeJson(res, 500, {
    ok: false,
    error: { code: 'internal', message },
  } satisfies ApiErr)
}

/** Narrow an unknown payload value to a string, else throw bad-request. */
export function requireString(payload: unknown, key: string): string {
  const record = payload as Record<string, unknown> | null
  const value = record?.[key]
  if (typeof value !== 'string' || value === '') {
    throw new ApiFailure('bad-request', `missing or invalid "${key}"`)
  }
  return value
}

/** Narrow an unknown payload value to a plain object, else throw bad-request. */
export function requireObject(payload: unknown, key: string): Record<string, unknown> {
  const record = payload as Record<string, unknown> | null
  const value = record?.[key]
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiFailure('bad-request', `missing or invalid "${key}"`)
  }
  return value as Record<string, unknown>
}

/** Narrow an unknown payload value to a boolean, else throw bad-request. */
export function requireBoolean(payload: unknown, key: string): boolean {
  const record = payload as Record<string, unknown> | null
  const value = record?.[key]
  if (typeof value !== 'boolean') {
    throw new ApiFailure('bad-request', `missing or invalid "${key}"`)
  }
  return value
}
