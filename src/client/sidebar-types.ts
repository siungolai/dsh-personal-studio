/**
 * The host types the workbench needs, derived rather than restated.
 *
 * The sidebar publishes its client-side contract on the
 * `dsh-better-sidebar/client/service` subpath — the one whose declaration
 * graph is free of the host's Node-side types. That subpath does not
 * re-export the session-projection types, so they are derived here from the
 * tab props' own context type. Deriving keeps one definition of "what a
 * session projection is" (the host's) without pulling the host's root
 * declaration graph — and everything Node-flavoured in it — into the
 * browser bundle's type surface.
 */
import type { TabComponentProps } from 'dsh-better-sidebar/client/service'

/** The host's context, as the tab component receives it. */
export type SidebarContext = TabComponentProps['ctx']

/** The host's session list: the summaries plus the per-session projections. */
export type SidebarSessionList = ReturnType<SidebarContext['sessions']['list']['getSnapshot']>

/** One session's summary. */
export type SidebarSessionSummary = SidebarSessionList['byId'][string]

/** The per-session projection map, when the host has one. */
export type SidebarProjections = NonNullable<SidebarSessionList['projectionsBySession']>

/** One session's projection. */
export type SidebarProjection = SidebarProjections[string]

/** The token usage one session has accumulated. */
export type SidebarTokenUsage = NonNullable<SidebarProjection['values']['tokenUsage']>

/** The timing one session has accumulated. */
export type SidebarSubagentTiming = NonNullable<SidebarProjection['values']['subagentTiming']>
