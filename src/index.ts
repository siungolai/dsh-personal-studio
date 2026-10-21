/**
 * Host half of dsh-personal-studio.
 *
 * It owns two things the browser cannot have for itself:
 *
 * - the data file under `$DSH_HOME/personal-studio/`, holding the user's
 *   todos, notes and bookmarks;
 * - the host machine's live system facts, which no browser API exposes.
 *
 * Both are served over one JSON route (`/personal-studio/api/*`) that passes
 * the same browser-trust fence every other DSH route passes, plus the host's
 * own request gate when the host publishes one.
 */
import type { Context } from '@deepseek-ai/cordis'
// The host-webserver package augments `@deepseek-ai/cordis` with
// `ctx.webServer`; the type-only import is what makes that augmentation
// visible here.
import type {} from '@deepseek-ai/dsh-host-webserver'
import { API_PREFIX, createApiHandler } from './host/api.ts'
import { DataStore } from './host/store.ts'
import { isTrustedRequest } from './host/trust-fence.ts'

/** Plugin identity for the Loader row. */
export const name = 'dsh-personal-studio'

/**
 * Services required before mounting: the web server (to register the route).
 *
 * Nothing else is required, on purpose.
 *
 * - `connection` is OPTIONAL and is deliberately not in this list: the host
 *   publishes it only after its own async init, so a plugin that waits for it
 *   would stay pending on a host that never publishes it. The gate below
 *   reads it per request instead.
 * - `webRuntime` was the name an older host line used for the trusted-host
 *   list (dsh-better-sidebar 0.26.0 still injects it). The current host does
 *   not publish that service at all — the list now lives on the connection
 *   service — so waiting for it would keep this plugin pending forever.
 * - `loader` is not needed either: the plugin never reads its own Loader row.
 */
export const inject = ['webServer']

/**
 * The host's own request gate, when it publishes one.
 *
 * DSH's connection service exposes `requestRejection(request)`: its Host /
 * Origin fence, then its browser login — 403, 401, or undefined for a request
 * it would admit to its own API. A third-party route registered on the bare
 * webServer never passes through that gate on its own, so this plugin asks
 * for the one the host already runs.
 */
interface ConnectionService {
  requestRejection?: (request: unknown) => number | undefined
  trustedHosts?: readonly string[]
}

/** The older host line's service that carried the trusted-host list. */
interface WebRuntimeService {
  trustedHosts?: readonly string[]
}

/**
 * The deployment's declared authorities.
 *
 * Read per request, not at mount: the host publishes `connection` only after
 * its own async init, and a mount-time read would see no service and then
 * narrow the fence to loopback for the life of the process.
 *
 * Two service names carry this list across host generations: `connection`
 * (current) and `webRuntime` (the line dsh-better-sidebar 0.26.0 was written
 * against). Both are optional, so both are read and the first list found
 * wins.
 */
function trustedHostsOf(ctx: Context): readonly string[] {
  const connection = ctx.get('connection') as ConnectionService | undefined
  const hosts = connection?.trustedHosts
  if (Array.isArray(hosts)) return hosts
  const runtime = ctx.get('webRuntime') as WebRuntimeService | undefined
  const legacy = runtime?.trustedHosts
  return Array.isArray(legacy) ? legacy : []
}

/** The host's request gate, when it publishes one. */
function requestGateOf(ctx: Context): ((request: unknown) => number | undefined) | undefined {
  const connection = ctx.get('connection') as ConnectionService | undefined
  const gate = connection?.requestRejection
  return typeof gate === 'function' ? (request) => gate.call(connection, request) : undefined
}

/**
 * Plugin body: mount the fenced API route.
 */
export function apply(ctx: Context): void {
  const store = new DataStore()
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: createApiHandler(
        store,
        (req) => isTrustedRequest(req, trustedHostsOf(ctx)),
        requestGateOf(ctx),
      ),
    }),
    'dsh-personal-studio: /personal-studio/api routes',
  )
}
