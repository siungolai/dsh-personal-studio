/**
 * The data file: this plugin's store of record for the three user domains
 * (todos / notes / bookmarks).
 *
 * Why a file and not the Loader row's config: a form write rewrites the whole
 * row, which the profile's live patch-reload replays across the entire plugin
 * tree — a per-keystroke cost that grows with the data. A file is ours, it
 * costs one atomic rename per write, and the client never has to know where
 * it lives.
 *
 * The file lives at `$DSH_HOME/personal-studio/data.json` — under the
 * Harness home, not inside a profile, so the data survives a profile switch
 * and a profile rebuild. It holds no secrets.
 */
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  DATA_DIR_NAME,
  DATA_FILE_NAME,
  DATA_VERSION,
  MAX_DATA_BYTES,
  emptyDocument,
  type Bookmark,
  type DataDocument,
  type NoteNode,
  type Task,
  type TaskPriority,
} from '../shared/types.ts'
import { ApiFailure } from './wire.ts'

/**
 * The Harness home, honouring `$DSH_HOME` and falling back to `~/.dsh`.
 *
 * The host's own `@deepseek-ai/dsh-home-paths` package resolves this, but it
 * is a peer the profile does not install (the web profile carries only
 * `cosmokit` and `schemastery` under `@deepseek-ai/`), and pulling it in
 * would drag an old host package into the dependency preflight. The rule is
 * short enough to restate: an explicit override, then `$DSH_HOME`, then
 * `~/.dsh`.
 */
export function resolveDshHome(env: Record<string, string | undefined> = process.env): string {
  const configured = env.DSH_HOME
  const selected = configured !== undefined && configured.trim() !== ''
    ? configured.trim()
    : join(homedir(), '.dsh')
  return resolve(selected)
}

/** The directory holding this plugin's data file. */
export function dataDir(env: Record<string, string | undefined> = process.env): string {
  return join(resolveDshHome(env), DATA_DIR_NAME)
}

/** The data file's absolute path. */
export function dataFile(env: Record<string, string | undefined> = process.env): string {
  return join(dataDir(env), DATA_FILE_NAME)
}

/** Whether a value is a plain object (not an array, not null). */
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

/** One task as it comes off disk, repaired to the shape the panel expects. */
function reviveTask(raw: unknown): Task | undefined {
  if (!isObject(raw)) return undefined
  const id = asString(raw.id, '')
  const title = asString(raw.title, '')
  if (id === '' || title === '') return undefined
  const priorityRaw = asString(raw.priority, 'normal')
  const priority: TaskPriority = priorityRaw === 'high' || priorityRaw === 'low' ? priorityRaw : 'normal'
  return {
    id,
    title,
    done: asBoolean(raw.done, false),
    priority,
    dueDate: asOptionalString(raw.dueDate),
    sessionId: asOptionalString(raw.sessionId),
    order: asNumber(raw.order, 0),
    createdAt: asNumber(raw.createdAt, 0),
    updatedAt: asNumber(raw.updatedAt, 0),
  }
}

/** One note node as it comes off disk, repaired to the shape the panel expects. */
function reviveNote(raw: unknown): NoteNode | undefined {
  if (!isObject(raw)) return undefined
  const id = asString(raw.id, '')
  const title = asString(raw.title, '')
  if (id === '' || title === '') return undefined
  return {
    id,
    parentId: asOptionalString(raw.parentId),
    title,
    body: asString(raw.body, ''),
    folder: asBoolean(raw.folder, false),
    order: asNumber(raw.order, 0),
    createdAt: asNumber(raw.createdAt, 0),
    updatedAt: asNumber(raw.updatedAt, 0),
  }
}

/** One bookmark as it comes off disk, repaired to the shape the panel expects. */
function reviveBookmark(raw: unknown): Bookmark | undefined {
  if (!isObject(raw)) return undefined
  const id = asString(raw.id, '')
  const url = asString(raw.url, '')
  if (id === '' || url === '') return undefined
  return {
    id,
    url,
    title: asOptionalString(raw.title),
    order: asNumber(raw.order, 0),
    createdAt: asNumber(raw.createdAt, 0),
    updatedAt: asNumber(raw.updatedAt, 0),
  }
}

/**
 * Repair a parsed document into the shape the panels expect.
 *
 * A hand-edited file, a half-written file from an older version, or a file
 * whose rows are not objects must not take the panel down: every row that
 * cannot be understood is dropped, every field that cannot be understood
 * falls back to its default. A lossy read is a recoverable annoyance; a
 * throwing read is a broken panel.
 */
export function reviveDocument(parsed: unknown): DataDocument {
  const document = emptyDocument()
  if (!isObject(parsed)) return document
  if (Array.isArray(parsed.tasks)) {
    for (const raw of parsed.tasks) {
      const task = reviveTask(raw)
      if (task !== undefined) document.tasks.push(task)
    }
  }
  if (Array.isArray(parsed.notes)) {
    for (const raw of parsed.notes) {
      const note = reviveNote(raw)
      if (note !== undefined) document.notes.push(note)
    }
  }
  if (Array.isArray(parsed.bookmarks)) {
    for (const raw of parsed.bookmarks) {
      const bookmark = reviveBookmark(raw)
      if (bookmark !== undefined) document.bookmarks.push(bookmark)
    }
  }
  return document
}

/**
 * The store that owns the data file.
 *
 * Writes are serialized through one promise chain: a burst of quick edits
 * (typing in a note, ticking several todos) must not interleave two
 * read-modify-write cycles, or the later write would carry the earlier one's
 * stale document and lose the first edit.
 */
export class DataStore {
  private queue: Promise<void> = Promise.resolve()
  private cached: DataDocument | undefined

  constructor(private readonly env: Record<string, string | undefined> = process.env) {}

  /** The file this store owns. */
  get path(): string {
    return dataFile(this.env)
  }

  /**
   * Read the document, repairing whatever is broken.
   *
   * A file that cannot be parsed at all is reported as `data-corrupt` rather
   * than silently replaced: an empty list that silently overwrites a user's
   * notes is the worst possible outcome, so a broken file is left on disk
   * and the panel is told what happened.
   */
  async read(): Promise<DataDocument> {
    if (this.cached !== undefined) return this.cached
    let text: string
    try {
      text = await readFile(this.path, 'utf8')
    } catch (error) {
      if (isNotFound(error)) {
        this.cached = emptyDocument()
        return this.cached
      }
      throw new ApiFailure('unavailable', 'the data file could not be read', 503)
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new ApiFailure('data-corrupt', 'the data file is not valid JSON', 500)
    }
    if (!isObject(parsed)) {
      throw new ApiFailure('data-corrupt', 'the data file is not a data document', 500)
    }
    const version = asNumber(parsed.version, DATA_VERSION)
    if (version !== DATA_VERSION) {
      throw new ApiFailure(
        'data-corrupt',
        `the data file has version ${version}, this plugin reads version ${DATA_VERSION}`,
        500,
      )
    }
    this.cached = reviveDocument(parsed)
    return this.cached
  }

  /**
   * Write the document atomically.
   *
   * The write goes to a sibling temp file and is then renamed over the
   * target: a rename within one directory is atomic, so a crash mid-write
   * leaves the previous document intact rather than a half-written one.
   */
  private async write(document: DataDocument): Promise<void> {
    const text = `${JSON.stringify(document, null, 2)}\n`
    const bytes = Buffer.byteLength(text, 'utf8')
    if (bytes > MAX_DATA_BYTES) {
      throw new ApiFailure(
        'data-too-large',
        `the data would be ${bytes} bytes, the limit is ${MAX_DATA_BYTES}`,
        413,
      )
    }
    const target = this.path
    await mkdir(dataDir(this.env), { recursive: true })
    const temp = `${target}.${process.pid}.tmp`
    await writeFile(temp, text, 'utf8')
    try {
      await rename(temp, target)
    } catch (error) {
      await rmQuietly(temp)
      throw error
    }
    this.cached = document
  }

  /**
   * Apply one mutation to the document and persist the result.
   *
   * The mutation runs inside the write queue, so it always sees the latest
   * document and two quick edits cannot overwrite each other.
   */
  async mutate<T>(mutator: (document: DataDocument) => T): Promise<T> {
    const run = async (): Promise<T> => {
      const document = await this.read()
      const result = mutator(document)
      await this.write(document)
      return result
    }
    const next = this.queue.then(run, run)
    this.queue = next.then(() => undefined, () => undefined)
    return next
  }

  /** Drop the cached document, so the next read hits the disk. */
  invalidate(): void {
    this.cached = undefined
  }
}

/** Whether an error is node's "file not found". */
function isNotFound(error: unknown): boolean {
  return isObject(error) && error.code === 'ENOENT'
}

/** Remove a file, ignoring the failure. */
async function rmQuietly(path: string): Promise<void> {
  try {
    const { rm } = await import('node:fs/promises')
    await rm(path, { force: true })
  } catch {
    // The temp file is already gone, or the directory is read-only. Either way
    // the rename failed for a different reason and the caller reports it.
  }
}

/** The file's size in bytes, or undefined when it does not exist. */
export async function dataFileSize(env: Record<string, string | undefined> = process.env): Promise<number | undefined> {
  try {
    const info = await stat(dataFile(env))
    return info.size
  } catch {
    return undefined
  }
}
