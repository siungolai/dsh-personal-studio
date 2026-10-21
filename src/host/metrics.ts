/**
 * The host machine's live system facts: CPU, memory and disk occupancy.
 *
 * The client cannot measure any of this — the browser exposes no CPU or
 * memory counters, and the DSH host publishes no system-info service — so
 * the host half samples it here and the client polls the route.
 *
 * Every metric is OPTIONAL. A machine that answers one probe and not another
 * reports what it knows: a missing number means "not measurable here", which
 * is a different statement from "zero".
 */
import { cpus, freemem, totalmem } from 'node:os'
import { statfs } from 'node:fs/promises'
import { resolveDshHome } from './store.ts'
import type { SystemMetrics } from '../shared/types.ts'

/**
 * The CPU-time snapshot the next reading is compared against.
 *
 * `os.cpus()` reports each core's accumulated USER and SYSTEM time since
 * boot, not its current load — so a single reading says nothing about
 * occupancy. The delta between two readings, divided by the wall-clock time
 * between them, is the load. That is why the first request after a restart
 * has no CPU number to report: there is no earlier snapshot to compare it
 * against.
 */
interface CpuSample {
  /** Accumulated CPU time in ms across all cores. */
  busyMs: number
  /** Epoch ms the sample was taken. */
  at: number
}

let lastSample: CpuSample | undefined

/** Accumulated CPU time in ms across all cores. */
function busyTimeMs(): number {
  let total = 0
  for (const cpu of cpus()) {
    // node names the system-time bucket `sys`; `user` and `sys` are the two
    // buckets a load average is built from.
    total += cpu.times.user + cpu.times.sys
  }
  return total
}

/**
 * The CPU occupancy since the previous reading, in percent (0–100).
 *
 * Undefined on the first reading of the process: there is no interval to
 * divide by yet, and a made-up number would be worse than none.
 */
function cpuPercent(now: number): number | undefined {
  const busy = busyTimeMs()
  const previous = lastSample
  lastSample = { busyMs: busy, at: now }
  if (previous === undefined) return undefined
  const elapsed = now - previous.at
  if (elapsed <= 0) return undefined
  const busyDelta = busy - previous.busyMs
  if (!Number.isFinite(busyDelta) || busyDelta < 0) return undefined
  const cores = cpus().length || 1
  const capacity = elapsed * cores
  if (capacity <= 0) return undefined
  const percent = (busyDelta / capacity) * 100
  if (!Number.isFinite(percent)) return undefined
  return Math.min(100, Math.max(0, percent))
}

/** The memory occupancy in percent (0–100), or undefined when unmeasurable. */
function memPercent(): number | undefined {
  const total = totalmem()
  if (!Number.isFinite(total) || total <= 0) return undefined
  const free = freemem()
  if (!Number.isFinite(free) || free < 0) return undefined
  const used = total - free
  return Math.min(100, Math.max(0, (used / total) * 100))
}

/**
 * The disk occupancy of the volume holding the Harness home, in percent.
 *
 * `fs.statfs` reports the filesystem's block counts, which is the portable
 * way to answer this on Linux, macOS and Windows alike — Windows has no
 * `df`, and shelling out to one would be a platform branch for a number the
 * kernel already has.
 */
async function diskPercent(path: string): Promise<number | undefined> {
  try {
    const stats = await statfs(path)
    const total = stats.blocks * stats.bsize
    if (!Number.isFinite(total) || total <= 0) return undefined
    const free = stats.bfree * stats.bsize
    if (!Number.isFinite(free) || free < 0) return undefined
    const used = total - free
    return Math.min(100, Math.max(0, (used / total) * 100))
  } catch {
    return undefined
  }
}

/**
 * Take one snapshot of the host machine's system facts.
 *
 * @param env - the environment mapping, read for `$DSH_HOME` (the disk probe
 *   measures the volume the Harness home lives on).
 * @returns the metrics that could be measured.
 */
export async function collectMetrics(
  env: Record<string, string | undefined> = process.env,
): Promise<SystemMetrics> {
  const now = Date.now()
  const [disk] = await Promise.all([diskPercent(resolveDshHome(env))])
  return {
    cpuPercent: cpuPercent(now),
    memPercent: memPercent(),
    diskPercent: disk,
    at: now,
  }
}
