/**
 * The client half: one sidebar tab, five panels inside it.
 *
 * The workbench registers ONE tab with the sidebar and switches between five
 * panels inside it. A second tab per panel would give the user five entries
 * in the guide and five chances to open the same data twice; one tab with a
 * switcher keeps a single door to the workbench.
 *
 * The tab is registered through a SOFT dependency: `betterSidebar` is an
 * optional peer, and a profile without it must not fail to start because of
 * this plugin. A static `inject` would park the plugin in `pending` forever
 * on such a profile, so the tab is mounted from a dynamic plugin whose
 * `inject` names the sidebar: the mount is skipped when the service never
 * arrives.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { TabComponentProps, TabDescriptor } from 'dsh-better-sidebar/client/service'
import { Button, SegmentedControl } from './controls.tsx'
import { IconBookmark, IconChecklist, IconClock, IconGauge, IconNote } from './icons.tsx'
import { createHostApi } from './api.ts'
import { readPrefs, readPrefsBlob, PREF_TOGGLES, WORKBENCH_TAB_ID, type TaskSort } from './prefs.ts'
import { createWorkbenchStore, type WorkbenchStore } from './workbench-store.ts'
import { BookmarkPanel } from './panels/bookmark.tsx'
import { NotePanel } from './panels/note.tsx'
import { ServerPanel } from './panels/server.tsx'
import { SessionPanel } from './panels/session.tsx'
import { TodoPanel } from './panels/todo.tsx'
import styles from './workbench.module.css'

/** The panels the workbench holds, in the order they are shown. */
const PANELS = [
  { id: 'todo', label: '待办' },
  { id: 'note', label: '笔记' },
  { id: 'bookmark', label: '书签' },
  { id: 'session', label: '会话' },
  { id: 'server', label: '状态' },
] as const

/** One panel's id. */
type PanelId = (typeof PANELS)[number]['id']

/** The tab's per-instance UI state, kept in the tab's own meta. */
interface TabMeta {
  panel?: PanelId
}

/**
 * Read the panel in view from the tab's meta.
 *
 * The panel choice is UI state, not business data: it belongs to the tab
 * record, which the sidebar persists with the layout, and not to the data
 * file, which is about todos, notes and bookmarks.
 */
function panelOf(tab: { meta?: unknown }): PanelId {
  const meta = tab.meta as TabMeta | undefined
  const panel = meta?.panel
  return PANELS.some((entry) => entry.id === panel) ? (panel as PanelId) : 'todo'
}

/** The workbench's tab body. */
function WorkbenchView({
  ctx,
  store,
  scope,
  tab,
  visible,
  workbench,
}: TabComponentProps & { workbench: WorkbenchStore }) {
  // The panel in view is the tab record's own state. The local state mirrors
  // it so a click feels instant, and the record write below makes it durable.
  const [panel, setPanel] = useState<PanelId>(() => panelOf(tab))

  const snapshot = useSyncExternalStore(
    workbench.subscribe,
    workbench.getSnapshot,
    workbench.getSnapshot,
  )

  // The sidebar's prefs carry the three settings; a change to them must
  // reach the panels, so the blob is SUBSCRIBED to rather than read once.
  // The snapshot object is replaced on every real change, so the identity
  // is a safe change signal.
  const prefsBlob = useSyncExternalStore(
    useCallback((listener: () => void) => store.subscribe(listener), [store]),
    useCallback(() => readPrefsBlob(store), [store]),
    useCallback(() => readPrefsBlob(store), [store]),
  )
  const prefs = readPrefs(prefsBlob)

  // The number of unfinished todos. The sidebar's native chip draws only
  // an icon, a title and an unread dot, so the count rides the TITLE (the
  // chip reads the tab record's title) and the panel switcher.
  const pendingCount = useMemo(
    () => snapshot.document.tasks.reduce((total, task) => (task.done ? total : total + 1), 0),
    [snapshot.document.tasks],
  )

  // The sessions service is optional: a profile without it shows an empty
  // session panel instead of failing to mount.
  const sessions = ctx.get('sessions')
  const [sessionList, setSessionList] = useState(sessions?.list.getSnapshot())

  useEffect(() => {
    if (sessions === undefined) return
    const unsubscribe = sessions.list.subscribe(() => {
      setSessionList(sessions.list.getSnapshot())
    })
    return unsubscribe
  }, [sessions])

  // The server panel polls on the interval the user set, and only while the
  // tab is on screen: a background tab that keeps asking the host for
  // numbers is work nobody asked for.
  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      void workbench.refreshMetrics()
    }, prefs.refreshSec * 1000)
    return () => clearInterval(interval)
  }, [visible, workbench, prefs.refreshSec])

  const save = useCallback(
    (mutate: (current: typeof snapshot.document) => typeof snapshot.document) => {
      void workbench.save(mutate(snapshot.document))
    },
    [workbench, snapshot.document],
  )

  const liveSessionIds = useMemo(
    () => new Set(Object.keys(sessionList?.byId ?? {})),
    [sessionList],
  )

  const switchTo = (next: PanelId): void => {
    setPanel(next)
    // The panel choice rides on the tab record, so the sidebar persists it
    // with the rest of the layout. The scope names the seat session this
    // record lives in: a native tab id is shared by every session, so an
    // unqualified write would be ambiguous — and a write that misses its
    // record is a silent no-op.
    try {
      ctx.get('betterSidebar')?.updateTab(
        tab.id,
        { meta: { panel: next } satisfies TabMeta },
        scope.sessionId,
      )
    } catch (error) {
      console.error('[dsh-personal-studio] could not remember the panel choice:', error)
    }
  }

  // The chip's title carries the count of unfinished todos. The sidebar's
  // native chip draws an icon, the tab record's title and an unread dot —
  // no badge — so the title is where the number has to live. The write is
  // a record update, which the chip re-reads on its own.
  const tabTitle = pendingCount > 0 ? `工作台 ${pendingCount}` : '工作台'
  useEffect(() => {
    if (tab.title === tabTitle) return
    try {
      // The scope names the seat session this record lives in, and the
      // sidebar needs it: a native id is shared by every session, so an
      // unqualified write would be ambiguous.
      ctx.get('betterSidebar')?.updateTab(tab.id, { title: tabTitle }, scope.sessionId)
    } catch (error) {
      console.error('[dsh-personal-studio] could not update the tab title:', error)
    }
  }, [ctx, scope.sessionId, tab.id, tab.title, tabTitle])

  const openSession = (sessionId: string): void => {
    // DSH moved the "show this conversation" verb OFF the sessions service
    // (the runtime's `open` is gone) and onto the workspace face, which owns
    // the main-view selection. The old name stays as the fallback for a host
    // that predates the move — the same order the sidebar itself uses.
    const workspace = ctx.get('uiWorkspace') as { openSession?(target: string): void } | undefined
    try {
      if (typeof workspace?.openSession === 'function') {
        workspace.openSession(sessionId)
        return
      }
      ctx.get('sessions')?.open?.(sessionId)
    } catch (error) {
      console.error('[dsh-personal-studio] could not open the session:', error)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <SegmentedControl
          id="psw-panel"
          value={panel}
          options={PANELS.map((entry) => ({
            value: entry.id,
            // The todo panel shows how much is left to do, so the count is
            // visible without opening the panel itself.
            label: entry.id === 'todo' && pendingCount > 0
              ? `${entry.label} ${pendingCount}`
              : entry.label,
          }))}
          label="工作台面板"
          onChange={switchTo}
        />
      </div>
      {snapshot.error !== undefined ? <div className={styles.error}>{snapshot.error}</div> : null}
      {panel === 'todo' ? (
        <TodoPanel
          tasks={snapshot.document.tasks}
          sort={prefs.defaultSort}
          showCompleted={prefs.showCompleted}
          liveSessionIds={liveSessionIds}
          onChange={(tasks) => save((current) => ({ ...current, tasks }))}
        />
      ) : null}
      {panel === 'note' ? (
        <NotePanel
          notes={snapshot.document.notes}
          onChange={(notes) => save((current) => ({ ...current, notes }))}
        />
      ) : null}
      {panel === 'bookmark' ? (
        <BookmarkPanel
          bookmarks={snapshot.document.bookmarks}
          onChange={(bookmarks) => save((current) => ({ ...current, bookmarks }))}
        />
      ) : null}
      {panel === 'session' ? <SessionPanel list={sessionList} onOpenSession={openSession} /> : null}
      {panel === 'server' ? (
        <ServerPanel
          metrics={snapshot.metrics}
          error={snapshot.metricsError}
          onRefresh={() => void workbench.refreshMetrics()}
        />
      ) : null}
    </div>
  )
}

/**
 * The tab descriptor the sidebar registers.
 *
 * The descriptor is built per activation so it can close over the store:
 * the badge is computed by the sidebar OUTSIDE React, so the count has to
 * be reachable without a component.
 */
function createDescriptor(workbench: WorkbenchStore): TabDescriptor {
  return {
    id: WORKBENCH_TAB_ID,
    title: '工作台',
    description: '待办、笔记、书签、会话统计与服务器状态',
    icon: (size: number) => <IconChecklist size={size} />,
    order: 50,
    settings: { pluginToggles: PREF_TOGGLES },
    // The badge rides the sidebar's own tab strip. A profile that lands the
    // tab in the bottom workbench draws it; a profile with the native right
    // column does not (the native chip has no badge), which is why the
    // count also rides the tab title.
    badge: () => {
      const pending = workbench
        .getSnapshot()
        .document.tasks.reduce((total, task) => (task.done ? total : total + 1), 0)
      return pending > 0 ? pending : null
    },
    component: (props) => <WorkbenchView {...props} workbench={workbench} />,
  }
}

/**
 * Mount the workbench.
 *
 * @param ctx - the host plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    // The sidebar is an optional peer. When it is absent there is nothing
    // to register with, and the plugin simply does not appear.
    const fiber = ctx.plugin({
      name: 'dsh-personal-studio:tab',
      inject: ['betterSidebar'],
      apply: (inner) => {
        inner.effect(() => {
          const service = inner.get('betterSidebar')
          if (service === undefined) return () => {}
          // The store lives at the activation level, not inside the body:
          // the badge is computed by the sidebar outside React, and the
          // document has to be loaded before the tab is even opened.
          const api = createHostApi((path) => service.hostRouteUrl(path))
          const workbench = createWorkbenchStore(api)
          const dispose = service.registerTab(createDescriptor(workbench))
          void workbench.load()
          return () => {
            dispose()
          }
        }, 'dsh-personal-studio: register the workbench tab')
      },
    })
    return () => {
      void fiber.dispose?.()
    }
  }, 'dsh-personal-studio: mount')
}
