/**
 * The session-stats panel.
 *
 * It reads the host's session projections — the same source the sidebar's
 * own session views read — and shows two numbers per session: the tokens it
 * cost and how long it has run.
 *
 * The panel shows nothing it cannot justify. A session with no token usage
 * and no elapsed time is left out entirely rather than shown as a row of
 * zeroes, and a session with tokens but no duration shows the tokens alone
 * instead of a "0 秒" that would read as a measurement.
 */
import { useMemo } from 'react'
import type { SidebarSessionList, SidebarSessionSummary } from '../sidebar-types.ts'
import { Tag } from '../controls.tsx'
import { IconClock } from '../icons.tsx'
import { elapsedMs, formatDuration, formatTokens, totalTokens } from '../session-metrics.ts'
import styles from '../workbench.module.css'

/** The panel's props. */
export interface SessionPanelProps {
  /** The host's session list. */
  list: SidebarSessionList | undefined
  /** Called when the user asks to open a session. */
  onOpenSession: (sessionId: string) => void
}

/** One session's line, already measured. */
interface Row {
  summary: SidebarSessionSummary
  tokens: number
  duration: string | undefined
  running: boolean
}

export function SessionPanel({ list, onOpenSession }: SessionPanelProps) {
  const now = Date.now()
  const rows = useMemo<Row[]>(() => {
    if (list === undefined) return []
    const projections = list.projectionsBySession
    const measured: Row[] = []
    for (const summary of Object.values(list.byId ?? {})) {
      const projection = projections?.[summary.id]
      const usage = projection?.values?.tokenUsage
      const timing = projection?.values?.subagentTiming
      // A session with neither tokens nor a duration has nothing to say.
      if (usage === undefined && timing === undefined) continue
      const tokens = usage === undefined ? 0 : totalTokens(usage)
      const duration = formatDuration(elapsedMs(timing, now))
      if (tokens === 0 && duration === undefined) continue
      measured.push({ summary, tokens, duration, running: summary.running === true })
    }
    // The host's session list has no creation time, so there is no "recent
    // first" to sort by. The list keeps the host's own order and says so.
    return measured
  }, [list, now])

  if (rows.length === 0) {
    return <div className={styles.empty}>还没有可统计的会话。</div>
  }

  return (
    <div className={styles.body}>
      <div className={styles.section}>
        {rows.map(({ summary, tokens, duration, running }) => (
          <div key={summary.id} className={styles.row}>
            <IconClock size={12} className={styles.muted} />
            <button
              type="button"
              className={styles.rowTitle}
              style={{ background: 'none', border: 'none', textAlign: 'left', color: 'inherit', cursor: 'pointer' }}
              title="打开会话"
              onClick={() => onOpenSession(summary.id)}
            >
              {summary.displayTitle}
            </button>
            {running ? <Tag tone="info">运行中</Tag> : null}
            <span className={styles.mono}>{formatTokens(tokens)} tok</span>
            {duration !== undefined ? <span className={styles.muted}>{duration}</span> : null}
          </div>
        ))}
      </div>
      <div className={styles.muted} style={{ padding: '8px 0' }}>
        统计口径与侧边栏一致：输入含缓存读取与写入，总量为输入加输出；没有数据的会话不列出。
      </div>
    </div>
  )
}
