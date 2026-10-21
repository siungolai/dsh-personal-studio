/**
 * The workbench's view of a session's cost.
 *
 * The numbers come from the host's session projections, and the arithmetic
 * matches the sidebar's own metric helpers exactly: the client half may not
 * import a Harness client package, so the same formulas are restated here.
 * Restating them is a promise to keep, which is why the rules are written
 * out rather than hidden behind helpers.
 */
import type { SidebarSubagentTiming, SidebarTokenUsage } from './sidebar-types.ts'

/** One session's measured cost. */
export interface SessionMetrics {
  /** Tokens sent to the model, cache reads and writes included. */
  inputTokens: number
  /** Tokens the model produced. */
  outputTokens: number
  /** Input plus output. */
  totalTokens: number
  /** Wall-clock milliseconds the session has been running, when it has run at all. */
  elapsedMs?: number
}

/**
 * Tokens sent to the model.
 *
 * The four buckets in {@link SidebarTokenUsage} are disjoint, so they add up
 * directly: uncached input, cache reads and cache writes are all input.
 */
export function inputTokens(usage: SidebarTokenUsage): number {
  return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

/** Input plus output. */
export function totalTokens(usage: SidebarTokenUsage): number {
  return inputTokens(usage) + usage.outputTokens
}

/**
 * How long the session has been running.
 *
 * A session that has never run — a fresh one, or one whose projection has no
 * timing yet — has no duration to report. Reporting `0` would be a claim
 * about the world, and the difference between "no duration" and "no time
 * passed" is exactly what the user cannot see.
 */
export function elapsedMs(timing: SidebarSubagentTiming | undefined, now: number): number | undefined {
  if (timing === undefined) return undefined
  const active = timing.active === undefined ? 0 : Math.max(0, now - timing.active.since)
  const total = timing.settledMs + active
  return total > 0 ? total : undefined
}

/** A duration in a form a person reads at a glance. */
export function formatDuration(ms: number | undefined): string | undefined {
  if (ms === undefined) return undefined
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分 ${seconds % 60} 秒`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时 ${minutes % 60} 分`
  return `${Math.floor(hours / 24)} 天 ${hours % 24} 小时`
}

/** A token count in a form a person reads at a glance. */
export function formatTokens(count: number): string {
  if (count < 1000) return String(count)
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`
  return `${(count / 1_000_000).toFixed(1)}M`
}
