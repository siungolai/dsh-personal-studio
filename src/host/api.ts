/**
 * The API surface of this plugin's host half: one JSON route under
 * `/personal-studio/api`, method-dispatched the way dsh-better-sidebar's own
 * `/sidebar/api` is.
 *
 * The methods are deliberately coarse — the client fetches the whole data
 * document and posts the whole document back. A personal todo list is small
 * (the file is capped at 8 MiB), so a read-modify-write cycle over the
 * document beats per-record endpoints: one request per edit, no partial
 * failure, and the client never has to merge.
 *
 * Every request passes the browser-trust fence, and the host's own request
 * gate when it publishes one.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  MAX_DATA_BYTES,
  TASK_PRIORITIES,
  type Bookmark,
  type DataDocument,
  type NoteNode,
  type SystemMetrics,
  type Task,
  type TaskPriority,
} from '../shared/types.ts'
import { DataStore } from './store.ts'
import { collectMetrics } from './metrics.ts'
import { ApiFailure, readJsonBody, requireObject, writeError, writeOk } from './wire.ts'

/** The route prefix this plugin owns. */
export const API_PREFIX = '/personal-studio/api'

/** One API method: it reads the request payload and returns the answer. */
type Method = (payload: unknown, store: DataStore) => Promise<unknown> | unknown

/** Whether a value is a plain object. */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function asPriority(value: unknown): TaskPriority {
  return value === 'high' || value === 'low' ? value : 'normal'
}

/** A fresh id: the host owns id minting so two clients cannot collide. */
function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** The next sort key for a list: one past its last row. */
function nextOrder(rows: readonly { order: number }[]): number {
  let max = 0
  for (const row of rows) {
    if (row.order > max) max = row.order
  }
  return max + 1
}

/** Whether a URL is one the bookmark panel may store. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Replace the tasks array with the payload's list, keeping only the rows the
 * panel can render.
 *
 * The client owns the list (it is the editor), so the host validates rather
 * than merges: a row without an id or a title is dropped, and the rest is
 * taken as-is. That keeps the two halves in step without a merge policy
 * neither side has to agree on.
 */
function tasksFrom(payload: unknown, now: number): Task[] {
  if (!Array.isArray(payload)) return []
  const tasks: Task[] = []
  for (const raw of payload) {
    if (!isObject(raw)) continue
    const id = asString(raw.id, '')
    const title = asString(raw.title, '').trim()
    if (id === '' || title === '') continue
    const dueDate = asOptionalString(raw.dueDate)
    tasks.push({
      id,
      title,
      done: asBoolean(raw.done, false),
      priority: asPriority(raw.priority),
      dueDate: dueDate !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : undefined,
      sessionId: asOptionalString(raw.sessionId),
      order: asNumber(raw.order, 0),
      createdAt: asNumber(raw.createdAt, now),
      updatedAt: now,
    })
  }
  return tasks
}

/** Replace the notes array with the payload's tree, keeping the readable rows. */
function notesFrom(payload: unknown, now: number): NoteNode[] {
  if (!Array.isArray(payload)) return []
  const notes: NoteNode[] = []
  const seen = new Set<string>()
  for (const raw of payload) {
    if (!isObject(raw)) continue
    const id = asString(raw.id, '')
    const title = asString(raw.title, '').trim()
    if (id === '' || title === '' || seen.has(id)) continue
    seen.add(id)
    notes.push({
      id,
      parentId: asOptionalString(raw.parentId),
      title,
      body: asString(raw.body, ''),
      folder: asBoolean(raw.folder, false),
      order: asNumber(raw.order, 0),
      createdAt: asNumber(raw.createdAt, now),
      updatedAt: now,
    })
  }
  // A parent that is not in the list would strand the node: the tree walker
  // could never reach it. Those rows become top-level notes.
  for (const note of notes) {
    if (note.parentId !== undefined && !seen.has(note.parentId)) {
      note.parentId = undefined
    }
  }
  return notes
}

/** Replace the bookmarks array with the payload's list. */
function bookmarksFrom(payload: unknown, now: number): Bookmark[] {
  if (!Array.isArray(payload)) return []
  const bookmarks: Bookmark[] = []
  for (const raw of payload) {
    if (!isObject(raw)) continue
    const id = asString(raw.id, '')
    const url = asString(raw.url, '').trim()
    if (id === '' || !isHttpUrl(url)) continue
    bookmarks.push({
      id,
      url,
      title: asOptionalString(raw.title),
      order: asNumber(raw.order, 0),
      createdAt: asNumber(raw.createdAt, now),
      updatedAt: now,
    })
  }
  return bookmarks
}

/**
 * The method table.
 *
 * The dispatch table is an object literal, so a bare lookup would resolve
 * `Object.prototype` members as "methods" — `POST .../constructor` would
 * answer 200. The dispatcher therefore checks own properties and the
 * function type, the same guard dsh-better-sidebar applies.
 */
const METHODS: Record<string, Method> = {
  /** The whole document. */
  'data.get': (_payload, store) => store.read(),

  /** Replace the document. */
  'data.put': async (payload, store) => {
    const body = requireObject(payload, 'document')
    const now = Date.now()
    const document: DataDocument = {
      version: (await store.read()).version,
      tasks: tasksFrom(body.tasks, now),
      notes: notesFrom(body.notes, now),
      bookmarks: bookmarksFrom(body.bookmarks, now),
    }
    await store.mutate((current) => {
      current.tasks = document.tasks
      current.notes = document.notes
      current.bookmarks = document.bookmarks
    })
    return store.read()
  },

  /** Add one task. */
  'task.create': async (payload, store) => {
    const body = requireObject(payload, 'task')
    const title = asString(body.title, '').trim()
    if (title === '') throw new ApiFailure('bad-request', 'the task needs a title')
    const now = Date.now()
    return store.mutate((document) => {
      const task: Task = {
        id: newId('task'),
        title,
        done: false,
        priority: asPriority(body.priority),
        dueDate: asOptionalString(body.dueDate),
        sessionId: asOptionalString(body.sessionId),
        order: nextOrder(document.tasks),
        createdAt: now,
        updatedAt: now,
      }
      document.tasks.push(task)
      return task
    })
  },

  /** Add one note node. */
  'note.create': async (payload, store) => {
    const body = requireObject(payload, 'note')
    const title = asString(body.title, '').trim()
    if (title === '') throw new ApiFailure('bad-request', 'the note needs a title')
    const now = Date.now()
    return store.mutate((document) => {
      const note: NoteNode = {
        id: newId('note'),
        parentId: asOptionalString(body.parentId),
        title,
        body: asString(body.body, ''),
        folder: asBoolean(body.folder, false),
        order: nextOrder(document.notes.filter((row) => row.parentId === body.parentId)),
        createdAt: now,
        updatedAt: now,
      }
      document.notes.push(note)
      return note
    })
  },

  /** Add one bookmark. */
  'bookmark.create': async (payload, store) => {
    const body = requireObject(payload, 'bookmark')
    const url = asString(body.url, '').trim()
    if (!isHttpUrl(url)) throw new ApiFailure('bad-request', 'the bookmark needs an http(s) url')
    const now = Date.now()
    return store.mutate((document) => {
      const bookmark: Bookmark = {
        id: newId('bm'),
        url,
        title: asOptionalString(body.title),
        order: nextOrder(document.bookmarks),
        createdAt: now,
        updatedAt: now,
      }
      document.bookmarks.push(bookmark)
      return bookmark
    })
  },

  /** The host machine's live system facts. */
  'system.metrics': (_payload, store) => collectMetrics(),

  /** The limits the client needs to render consistent hints. */
  'system.limits': () => ({
    maxDataBytes: MAX_DATA_BYTES,
    priorities: TASK_PRIORITIES,
  }),
}

/**
 * Build the route handler for this plugin's API.
 *
 * @param store - the data store the methods read and write.
 * @param fence - the browser-trust decision for one request.
 * @param gate - the host's own request gate, when it publishes one: it
 *   answers 403/401 for a request the host would refuse to its own API.
 * @returns the handler to register on the webServer.
 */
export function createApiHandler(
  store: DataStore,
  fence: (req: IncomingMessage) => boolean,
  gate?: (req: IncomingMessage) => number | undefined,
): (req: IncomingMessage, res: ServerResponse) => void | Promise<void> {
  return async (req, res) => {
    if (!fence(req)) {
      writeError(res, new ApiFailure('forbidden', 'forbidden', 403))
      return
    }
    if (gate !== undefined) {
      let status: number | undefined
      try {
        status = gate(req)
      } catch {
        // A gate that throws has not admitted anything. Failing open here
        // would turn a host bug into the exposure this gate exists to close.
        status = 403
      }
      if (status !== undefined) {
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({
          ok: false,
          error: {
            code: 'forbidden',
            message: status === 401
              ? '需要先登录 DSH。 / DSH login required.'
              : '这个请求来自不受信任的地址，已拒绝。 / This request came from an untrusted origin and was refused.',
          },
        }))
        return
      }
    }
    if (req.method !== 'POST') {
      writeError(res, new ApiFailure('method-error', 'method not allowed', 405))
      return
    }
    const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
    const method = pathname.startsWith(`${API_PREFIX}/`)
      ? pathname.slice(API_PREFIX.length + 1)
      : undefined
    if (method === undefined || method.includes('/')) {
      writeError(res, new ApiFailure('not-found', 'unknown api method', 404))
      return
    }
    try {
      const payload = await readJsonBody(req)
      const handler = Object.hasOwn(METHODS, method) ? METHODS[method] : undefined
      if (typeof handler !== 'function') {
        throw new ApiFailure('not-found', `unknown api method "${method}"`, 404)
      }
      writeOk(res, await handler(payload, store))
    } catch (error) {
      writeError(res, error)
    }
  }
}
