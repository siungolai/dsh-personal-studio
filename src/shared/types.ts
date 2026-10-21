/**
 * The workbench's domain vocabulary, shared by both halves.
 *
 * This file is the ONLY module both halves import. It must stay free of Node
 * types and of React: the client bundle compiles it for the browser, and the
 * host bundle compiles it for Node. A type-only module would be erased by the
 * bundler, but the value constants below are shared deliberately — one
 * definition of a task's shape, so the client and the host can never disagree
 * about what a stored record looks like.
 */

/** The data document's schema version. A file with another version is kept aside. */
export const DATA_VERSION = 1

/** Where the data file lives under the Harness home. */
export const DATA_DIR_NAME = 'personal-studio'

/** The data file's name inside {@link DATA_DIR_NAME}. */
export const DATA_FILE_NAME = 'data.json'

/**
 * The data file's size ceiling, in bytes.
 *
 * The write path refuses a document past this bound instead of truncating it:
 * a truncated task list is worse than a rejected write, because the user
 * cannot tell which half of their notes survived.
 */
export const MAX_DATA_BYTES = 8 * 1024 * 1024

/** A task's priority. Lower number = more urgent. */
export type TaskPriority = 'high' | 'normal' | 'low'

/** The priority ladder, most urgent first — the order the UI sorts by. */
export const TASK_PRIORITIES: readonly TaskPriority[] = ['high', 'normal', 'low']

/** One todo entry. */
export interface Task {
  /** Stable id, minted by the host on create. */
  id: string
  /** The task's text. Never empty. */
  title: string
  /** Whether the task is done. */
  done: boolean
  /** The task's priority; defaults to {@link TaskPriority} 'normal'. */
  priority: TaskPriority
  /**
   * The task's due date as an ISO date (YYYY-MM-DD), or undefined for a task
   * without one. A DATE and not a timestamp: a todo is due on a day, and
   * pinning it to an hour would invent precision the user never gave.
   */
  dueDate?: string
  /**
   * The DSH session the task belongs to, or undefined for a task that belongs
   * to no conversation. The session may be deleted later — the panel then
   * renders the task without its session link rather than dropping the row
   * (the same "hide what you cannot justify" rule the metrics follow).
   */
  sessionId?: string
  /** Sort key: lower first. Ties fall back to creation time. */
  order: number
  /** Epoch ms the task was created. */
  createdAt: number
  /** Epoch ms the task last changed. */
  updatedAt: number
}

/** One note's position in the tree. */
export interface NoteNode {
  /** Stable id, minted by the host on create. */
  id: string
  /**
   * The parent folder's id, or undefined for a top-level note. A note is
   * either a folder (with children) or a leaf (with markdown body) — the same
   * node carries both roles, so moving a note is a parent change and nothing
   * else.
   */
  parentId?: string
  /** The note's title. Never empty. */
  title: string
  /** The note's markdown body; empty for a folder. */
  body: string
  /** Whether the node is a folder (has children, no body). */
  folder: boolean
  /** Sort key: lower first among its siblings. */
  order: number
  /** Epoch ms the node was created. */
  createdAt: number
  /** Epoch ms the node last changed. */
  updatedAt: number
}

/** One bookmarked link. */
export interface Bookmark {
  /** Stable id, minted by the host on create. */
  id: string
  /** The link target. Must be an http(s) URL. */
  url: string
  /** The link's label; falls back to the URL when absent. */
  title?: string
  /** Sort key: lower first. */
  order: number
  /** Epoch ms the bookmark was created. */
  createdAt: number
  /** Epoch ms the bookmark last changed. */
  updatedAt: number
}

/** The three data domains, one per top-level key of the data document. */
export interface DataDocument {
  /** The document's schema version. */
  version: number
  /** The todo list. */
  tasks: Task[]
  /** The note tree, flat: each node names its parent. */
  notes: NoteNode[]
  /** The bookmark list. */
  bookmarks: Bookmark[]
}

/** An empty document at the current version. */
export function emptyDocument(): DataDocument {
  return { version: DATA_VERSION, tasks: [], notes: [], bookmarks: [] }
}

/** The host's system snapshot for the 服务器状态 panel. */
export interface SystemMetrics {
  /** CPU occupancy in percent (0–100), or undefined when it cannot be measured. */
  cpuPercent?: number
  /** Memory occupancy in percent (0–100), or undefined when it cannot be measured. */
  memPercent?: number
  /** Disk occupancy in percent (0–100) of the volume holding the Harness home. */
  diskPercent?: number
  /** Epoch ms the snapshot was taken. */
  at: number
}

/** The API's failure envelope — mirrors the wire shape better-sidebar uses. */
export interface ApiError {
  /** A machine-readable code. */
  code: string
  /** A human-readable message. */
  message: string
}
