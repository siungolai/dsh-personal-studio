/**
 * The server-status panel.
 *
 * Three numbers about the machine the Harness runs on: CPU, memory and disk
 * occupancy. The host measures them (it is the only half that can read the
 * operating system) and the client polls on the interval the user set.
 *
 * The panel shows a meter only for a number that was actually measured. A
 * missing measurement is rendered as "—" rather than as 0%, because "0% CPU"
 * is a claim about a machine that is not running, and a machine that cannot
 * be measured is not the same machine as one that is idle.
 */
import type { SystemMetrics } from '../../shared/types.ts'
import { Button } from '../controls.tsx'
import { IconRefresh } from '../icons.tsx'
import styles from '../workbench.module.css'

/** The panel's props. */
export interface ServerPanelProps {
  /** The last measured facts. */
  metrics: SystemMetrics | undefined
  /** The last measurement failure. */
  error: string | undefined
  /** Called when the user asks for a fresh reading. */
  onRefresh: () => void
}

/** Which meter fill to use for a given occupancy. */
function toneOf(percent: number): string | undefined {
  if (percent >= 90) return styles.meterDanger
  if (percent >= 75) return styles.meterWarn
  return styles.meterFill
}

/** One meter's block. */
function Meter({ label, percent }: { label: string; percent: number | undefined }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{percent === undefined ? '—' : `${percent.toFixed(0)}%`}</div>
      <div className={styles.meter}>
        {percent === undefined ? null : (
          <div className={toneOf(percent)} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        )}
      </div>
    </div>
  )
}

/** The server-status panel. */
export function ServerPanel({ metrics, error, onRefresh }: ServerPanelProps) {
  return (
    <>
      <div className={styles.body}>
        {error !== undefined ? <div className={styles.error}>读不到主机状态：{error}</div> : null}
        <div className={styles.section}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Meter label="CPU" percent={metrics?.cpuPercent} />
            <Meter label="内存" percent={metrics?.memPercent} />
            <Meter label="磁盘" percent={metrics?.diskPercent} />
            <Button size="sm" variant="ghost" title="刷新" icon={<IconRefresh size={12} />} onClick={onRefresh} />
          </div>
          {metrics === undefined && error === undefined ? (
            <div className={styles.empty}>正在测量…</div>
          ) : null}
          <div className={styles.muted}>
            数据来自运行 DSH 的这台机器，磁盘一项统计的是存放 DSH 主目录的卷。
          </div>
        </div>
      </div>
    </>
  )
}
