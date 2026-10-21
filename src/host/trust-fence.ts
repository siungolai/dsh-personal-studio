/**
 * Browser-trust fence for this plugin's own host routes.
 *
 * The host applies NO server-wide authentication or origin policy to a
 * third-party route: "route owners such as `dsh-client-connection` enforce
 * their own request policy" (packages/host/webserver README). A route that
 * skips the fence is reachable by anything that can open a socket to the
 * port — including a page on another origin, since the loopback listener
 * answers it.
 *
 * This fence is the same DNS-rebinding / cross-site defence the /api gateway
 * and dsh-better-sidebar use, restated here because the host does not export
 * the helpers: a request must name OUR authority in the Host header (the one
 * header an attacker's page cannot forge), must not carry the browser's
 * cross-site marker, and must not name a foreign Origin.
 *
 * This is a rebinding defence, NOT authentication. The host's own connection
 * service (when it publishes one) is the layer that knows about login; this
 * fence only decides "is this request plausibly our own page".
 */
import type { IncomingHttpHeaders } from 'node:http'

/** The request facts the fence reads (structural subset of IncomingMessage). */
export interface TrustRequest {
  headers: IncomingHttpHeaders
}

/**
 * Origin of the Electron desktop shell's application page. The shell serves
 * the GUI from the `dsh-app:` scheme, so a page-initiated request carries
 * this origin while the request itself targets the Host's loopback
 * authority — an authority match is impossible by construction. The shell's
 * own request forwarder admits exactly this origin and refuses every other.
 */
const SHELL_APP_ORIGIN = 'dsh-app://app'

function header(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}

/** Normalized URL of a Host-header authority, or undefined when unparsable. */
function parseAuthority(authority: string): URL | undefined {
  try {
    return new URL(`http://${authority}`)
  } catch {
    return undefined
  }
}

/** Whether a normalized URL hostname names the local loopback authority. */
export function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** Canonical authority form: hostname, or hostname:port when a port was written. */
function canonicalAuthority(entry: string, entryUrl: URL): string {
  const port = entryUrl.port !== '' ? entryUrl.port : new URL(`https://${entry}`).port
  return port === '' ? entryUrl.hostname : `${entryUrl.hostname}:${port}`
}

/** Whether the request authority matches a trustedHosts entry (exact or port-less). */
function isTrustedAuthority(hostUrl: URL, trustedHosts: readonly string[]): boolean {
  return trustedHosts.some((entry) => {
    const entryUrl = parseAuthority(entry)
    if (entryUrl === undefined) return false
    return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
      ? entryUrl.hostname === hostUrl.hostname
      : entryUrl.host === hostUrl.host
  })
}

/**
 * Decide whether one request may reach this plugin's routes.
 *
 * @param request - the request facts (headers).
 * @param trustedHosts - the authorities the deployment serves besides
 *   loopback (LAN IP literals sampled at boot plus `--trusted-host` names).
 * @returns true when the Host is ours and the browser markers are same-origin.
 */
export function isTrustedRequest(request: TrustRequest, trustedHosts: readonly string[]): boolean {
  const host = header(request.headers, 'host')
  if (host === undefined) return false
  const hostUrl = parseAuthority(host)
  if (hostUrl === undefined) return false
  if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false
  // The browser states when IT considers a request cross-site; the host's own
  // fence refuses that outright, and it is the one marker a same-origin
  // request never carries.
  if (header(request.headers, 'sec-fetch-site') === 'cross-site') return false
  // Origin fence: when a browser attaches an Origin it must name this
  // hostname. Comparing hostname, not host: some Chromium builds serialize
  // the Origin of a non-default-port loopback page without the port, and
  // refusing those bricks every route. An ABSENT Origin is fine — the Host
  // fence above already bound the request. The literal "null" (sandboxed
  // iframes, file: pages) is an opaque origin, refused.
  const origin = header(request.headers, 'origin')
  if (origin === undefined) return true
  if (origin === SHELL_APP_ORIGIN) return true
  try {
    return new URL(origin).hostname === hostUrl.hostname
  } catch {
    return false
  }
}
