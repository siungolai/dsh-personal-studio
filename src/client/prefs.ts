/**
 * The workbench's own settings, read from the sidebar's plugin-settings blob.
 *
 * The three knobs are declared as `pluginToggles` on the tab descriptor, so
 * the sidebar renders them in the Side card settings page and persists them
 * under `pluginSettings['dsh-personal-studio:workbench']` — the official
 * place for a plugin's own low-frequency preferences. (It is NOT this
 * plugin's own Loader row; the plugin declares no config schema at all.)
 */
import type { SidebarStore } from 'dsh-better-sidebar/client/service'

/** The descriptor id — the key the settings blob is filed under. */
export const WORKBENCH_TAB_ID = 'dsh-personal-studio:workbench'

/** A stable empty blob, for the subscription that watches the real one. */
export const EMPTY_BLOB: Record<string, unknown> = {}

/** How the todo list is ordered by default. */
export type TaskSort = 'manual' | 'due' | 'priority'

/** The workbench's settings, with the defaults applied. */
export interface WorkbenchPrefs {
  /** Seconds between server-status refreshes. */
  refreshSec: number
  /** The todo list's default order. */
  defaultSort: TaskSort
  /** Whether finished todos stay on the list. */
  showCompleted: boolean
}

/** The defaults, used when the blob carries nothing yet. */
export const DEFAULT_PREFS: WorkbenchPrefs = {
  refreshSec: 5,
  defaultSort: 'manual',
  showCompleted: false,
}

const SORTS: readonly TaskSort[] = ['manual', 'due', 'priority']

function isSort(value: unknown): value is TaskSort {
  return SORTS.includes(value as TaskSort)
}

/**
 * Read the workbench's settings out of the sidebar's prefs blob.
 *
 * A blob that carries an unknown value keeps the default rather than
 * failing: a settings page the user cannot open because one key is odd is
 * worse than one setting that resets.
 */
export function readPrefs(blob: Record<string, unknown> | undefined): WorkbenchPrefs {
  if (blob === undefined) return { ...DEFAULT_PREFS }
  const refreshSec = typeof blob.refreshSec === 'number' && Number.isFinite(blob.refreshSec)
    ? Math.min(300, Math.max(1, Math.round(blob.refreshSec)))
    : DEFAULT_PREFS.refreshSec
  return {
    refreshSec,
    defaultSort: isSort(blob.defaultSort) ? blob.defaultSort : DEFAULT_PREFS.defaultSort,
    showCompleted: typeof blob.showCompleted === 'boolean'
      ? blob.showCompleted
      : DEFAULT_PREFS.showCompleted,
  }
}

/** The workbench's own settings blob, as the sidebar keeps it. */
export function readPrefsBlob(store: SidebarStore | undefined): Record<string, unknown> {
  return store?.getSnapshot().prefs.pluginSettings[WORKBENCH_TAB_ID] ?? EMPTY_BLOB
}

/** The sort options the settings page offers. */
export const SORT_OPTIONS: readonly { value: TaskSort; label: string }[] = [
  { value: 'manual', label: '手动排序' },
  { value: 'due', label: '按截止日' },
  { value: 'priority', label: '按优先级' },
]

/** The task priorities, most urgent first. */
export const PRIORITY_OPTIONS = ['high', 'normal', 'low'] as const

/**
 * The workbench's three settings, as the sidebar renders them.
 *
 * They are declared as `pluginToggles`, so the sidebar draws the rows in its
 * own settings page and persists them in the plugin's own blob — the
 * official place for a plugin's preferences, and a place the host's
 * settings schema does not have to know about.
 */
export const PREF_TOGGLES = [
  {
    key: 'refreshSec',
    type: 'number',
    title: '刷新间隔',
    desc: '服务器状态面板每隔多少秒重新测量一次（1–300 秒）',
    min: 1,
    max: 300,
  },
  {
    key: 'defaultSort',
    type: 'select',
    title: '待办默认排序',
    desc: '待办列表默认按什么顺序排列',
    options: SORT_OPTIONS.map((option) => ({ value: option.value, title: option.label })),
  },
  {
    key: 'showCompleted',
    type: 'switch',
    title: '显示已完成待办',
    desc: '勾选后，已完成的待办仍留在列表里',
  },
] as const
