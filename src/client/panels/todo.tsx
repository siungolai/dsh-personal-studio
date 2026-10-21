/**
 * The todo panel.
 *
 * A todo is a title, a done flag, a priority, an optional due date and an
 * optional owning session. The list is the editor: the panel owns the rows
 * it shows and posts the whole document back, which is why the write path is
 * a document replacement rather than a per-row patch.
 *
 * Two rules shape the rendering:
 *
 * - A finished todo is hidden unless the user asks for it, and asking is a
 *   setting, not a per-panel toggle.
 * - A todo whose session is gone keeps its row. The link disappears, not
 *   the todo: the user wrote that line, and a deleted conversation does not
 *   un-write it.
 */
import { useMemo, useState } from 'react'
import type { Task, TaskPriority } from '../../shared/types.ts'
import { TASK_PRIORITIES } from '../../shared/types.ts'
import type { TaskSort } from '../prefs.ts'
import { Button, Checkbox, Input, SegmentedControl, Tag } from '../controls.tsx'
import { IconCheck, IconPlus, IconTrash, IconWarning } from '../icons.tsx'
import styles from '../workbench.module.css'

/** The panel's props. */
export interface TodoPanelProps {
  /** The todos to show. */
  tasks: readonly Task[]
  /** The current order. */
  sort: TaskSort
  /** Whether finished todos stay on the list. */
  showCompleted: boolean
  /** The ids of the sessions that still exist. */
  liveSessionIds: ReadonlySet<string>
  /** Called when the list changes. */
  onChange: (next: Task[]) => void
}

/** Today, as an ISO date. */
function today(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高',
  normal: '中',
  low: '低',
}

const PRIORITY_TONES: Record<TaskPriority, 'danger' | 'info' | 'neutral'> = {
  high: 'danger',
  normal: 'info',
  low: 'neutral',
}

/** Order the todos for display. */
function sortTasks(tasks: readonly Task[], sort: TaskSort): Task[] {
  const rows = [...tasks]
  if (sort === 'due') {
    rows.sort((a, b) => {
      // A todo without a due date sorts last: it has no deadline to miss.
      if (a.dueDate === undefined && b.dueDate === undefined) return a.order - b.order
      if (a.dueDate === undefined) return 1
      if (b.dueDate === undefined) return -1
      return a.dueDate === b.dueDate ? a.order - b.order : a.dueDate < b.dueDate ? -1 : 1
    })
    return rows
  }
  if (sort === 'priority') {
    rows.sort((a, b) => {
      const rank = TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority)
      return rank === 0 ? a.order - b.order : rank
    })
    return rows
  }
  rows.sort((a, b) => a.order - b.order)
  return rows
}

/** The todo panel. */
export function TodoPanel({ tasks, sort, showCompleted, liveSessionIds, onChange }: TodoPanelProps) {
  const [draft, setDraft] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')

  const visible = useMemo(
    () => sortTasks(tasks, sort).filter((task) => showCompleted || !task.done),
    [tasks, sort, showCompleted],
  )
  const doneCount = tasks.length - visible.length

  const add = (): void => {
    const title = draft.trim()
    if (title === '') return
    const now = Date.now()
    const task: Task = {
      id: `task_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      done: false,
      priority,
      dueDate: dueDate === '' ? undefined : dueDate,
      order: tasks.reduce((max, row) => (row.order > max ? row.order : max), 0) + 1,
      createdAt: now,
      updatedAt: now,
    }
    onChange([...tasks, task])
    setDraft('')
    setDueDate('')
    setPriority('normal')
  }

  const patch = (id: string, changes: Partial<Task>): void => {
    onChange(tasks.map((task) => (task.id === id ? { ...task, ...changes, updatedAt: Date.now() } : task)))
  }

  const remove = (id: string): void => {
    onChange(tasks.filter((task) => task.id !== id))
  }

  return (
    <>
      <div className={styles.body}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            {tasks.length === 0 ? '还没有待办。在下面写一条。' : '没有未完成的待办。'}
          </div>
        ) : (
          <div className={styles.section}>
            {visible.map((task) => {
              const overdue = task.dueDate !== undefined && !task.done && task.dueDate < today()
              return (
                <div key={task.id} className={styles.row}>
                  <Checkbox
                    checked={task.done}
                    label={task.title}
                    className={[styles.grow, styles.rowTitle, task.done ? styles.done : undefined].filter(Boolean).join(' ')}
                    onChange={(next) => patch(task.id, { done: next })}
                  />
                  <div className={styles.muted}>
                    {task.dueDate !== undefined ? task.dueDate : ''}
                    {task.sessionId !== undefined
                      ? liveSessionIds.has(task.sessionId)
                        ? ' · 关联会话'
                        : ' · 关联会话已删除'
                      : ''}
                  </div>
                  {overdue ? <IconWarning size={12} className={styles.muted} /> : null}
                  <Tag tone={PRIORITY_TONES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Tag>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="删除"
                    icon={<IconTrash size={12} />}
                    onClick={() => remove(task.id)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className={styles.composer}>
        <Input
          value={draft}
          placeholder="新待办"
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') add()
          }}
        />
        <input
          type="date"
          className={styles.mono}
          value={dueDate}
          title="截止日"
          onChange={(event) => setDueDate(event.currentTarget.value)}
        />
        <SegmentedControl
          id="psw-todo-priority"
          value={priority}
          options={TASK_PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))}
          label="优先级"
          onChange={setPriority}
        />
        <Button variant="primary" size="sm" icon={<IconPlus size={12} />} title="添加" onClick={add} />
      </div>
      {doneCount > 0 ? (
        <div className={styles.muted} style={{ padding: '0 10px 8px' }}>
          <IconCheck size={10} /> 已完成 {doneCount} 条
        </div>
      ) : null}
    </>
  )
}
