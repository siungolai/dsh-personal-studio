/**
 * The client half's shared state.
 *
 * One store instance per plugin activation holds the data document, the
 * host's live system facts, and the load/save state. The panels read it, and
 * so does the tab badge — which is why it is a store and not component
 * state: the badge is computed by the sidebar, outside React, and it must
 * see the same document the panels do.
 *
 * The store owns the fetch cycle; the panels own nothing but their own
 * view state.
 */
import { emptyDocument, type DataDocument, type SystemMetrics } from '../shared/types.ts'
import type { HostApi } from './api.ts'

/** The store's observable state. */
export interface WorkbenchSnapshot {
  /** The data document: todos, notes, bookmarks. */
  document: DataDocument
  /** Whether a read is in flight. */
  loading: boolean
  /** Whether a write is in flight. */
  saving: boolean
  /** The last failure, if any. */
  error: string | undefined
  /** The host machine's last measured facts. */
  metrics: SystemMetrics | undefined
  /** The last metrics failure, if any. */
  metricsError: string | undefined
}

/** The store's surface. */
export interface WorkbenchStore {
  /** Read the current state. The object identity changes only on a change. */
  getSnapshot(): WorkbenchSnapshot
  /** Watch for changes. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
  /** Fetch the document from the host. */
  load(): Promise<void>
  /** Replace the document on the host. */
  save(next: DataDocument): Promise<void>
  /** Measure the host machine again. */
  refreshMetrics(): Promise<void>
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Build the store.
 *
 * @param api - the host API client.
 * @returns the store.
 */
export function createWorkbenchStore(api: HostApi): WorkbenchStore {
  let snapshot: WorkbenchSnapshot = {
    document: emptyDocument(),
    loading: false,
    saving: false,
    error: undefined,
    metrics: undefined,
    metricsError: undefined,
  }
  const listeners = new Set<() => void>()

  const publish = (patch: Partial<WorkbenchSnapshot>): void => {
    snapshot = { ...snapshot, ...patch }
    for (const listener of listeners) {
      try {
        listener()
      } catch (error) {
        // A listener that throws must not stop the others: the panels are
        // independent, and one broken panel should not freeze the others.
        console.error('[dsh-personal-studio] store listener failed:', error)
      }
    }
  }

  const store: WorkbenchStore = {
    getSnapshot: () => snapshot,

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    load: async () => {
      publish({ loading: true, error: undefined })
      try {
        const document = await api.getData()
        publish({ document, loading: false })
      } catch (error) {
        publish({ loading: false, error: messageOf(error) })
      }
    },

    save: async (next) => {
      publish({ document: next, saving: true, error: undefined })
      try {
        // The host validates and answers with the document it kept, so the
        // client shows the host's truth rather than its own guess.
        const document = await api.putData(next)
        publish({ document, saving: false })
      } catch (error) {
        publish({ saving: false, error: messageOf(error) })
      }
    },

    refreshMetrics: async () => {
      try {
        const metrics = await api.metrics()
        publish({ metrics, metricsError: undefined })
      } catch (error) {
        publish({ metricsError: messageOf(error) })
      }
    },
  }

  return store
}
