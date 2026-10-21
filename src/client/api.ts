/**
 * The client half's view of this plugin's own host API.
 *
 * Every call goes through `ctx.betterSidebar.hostRouteUrl`, which resolves a
 * RELATIVE path against the page's own base. Writing the leading slash by
 * hand pins the request to the origin root: behind a reverse-proxy prefix
 * the request leaves the prefix and answers 404, and under the desktop
 * shell's `dsh-app://app/` origin it is not reachable at all.
 */
import type { ApiError, DataDocument, SystemMetrics } from '../shared/types.ts'

/** One API failure, as the wire reports it. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/** The API surface the client half consumes. */
export interface HostApi {
  /** Fetch the whole data document. */
  getData(): Promise<DataDocument>
  /** Replace the whole data document. */
  putData(document: DataDocument): Promise<DataDocument>
  /** Read the host machine's live system facts. */
  metrics(): Promise<SystemMetrics>
  /** Read the limits the panel should honour. */
  limits(): Promise<{ maxDataBytes: number; priorities: readonly string[] }>
}

/**
 * Build the API client bound to one sidebar context.
 *
 * @param route - the host route resolver (the sidebar's `hostRouteUrl`).
 * @returns the API client.
 */
export function createHostApi(route: (path: string) => string): HostApi {
  const call = async <T>(method: string, payload: unknown = {}): Promise<T> => {
    let response: Response
    try {
      response = await fetch(route(`personal-studio/api/${method}`), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      throw new ApiRequestError(
        'network',
        error instanceof Error ? error.message : String(error),
      )
    }
    const parsed = await response.json().catch(() => null) as {
      ok?: boolean
      value?: T
      error?: ApiError
    } | null
    if (parsed === null || parsed.ok !== true) {
      throw new ApiRequestError(
        parsed?.error?.code ?? 'http',
        parsed?.error?.message ?? `HTTP ${response.status}`,
      )
    }
    return parsed.value as T
  }

  return {
    getData: () => call('data.get'),
    putData: (document) => call('data.put', { document }),
    metrics: () => call('system.metrics'),
    limits: () => call('system.limits'),
  }
}
