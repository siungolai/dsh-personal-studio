/**
 * The notes panel.
 *
 * Notes live in a tree: a node is either a folder (it has children) or a
 * leaf (it has a markdown body). The stored form is flat — every node names
 * its parent — because a flat list survives a broken parent link, while a
 * nested object does not: one orphaned child would take its whole subtree
 * with it. The tree is rebuilt for display and only for display.
 *
 * The body is edited as plain markdown text. Rendering it as markdown would
 * need the host's markdown renderer, which the plugin rules forbid importing;
 * a textarea is honest about what it is.
 */
import { useMemo, useState } from 'react'
import type { NoteNode } from '../../shared/types.ts'
import { Button, Input } from '../controls.tsx'
import { IconChevronDown, IconChevronRight, IconFolder, IconPlus, IconTrash } from '../icons.tsx'
import styles from '../workbench.module.css'

/** The panel's props. */
export interface NotePanelProps {
  /** The note nodes, flat. */
  notes: readonly NoteNode[]
  /** Called when the tree changes. */
  onChange: (next: NoteNode[]) => void
}

/** One node with its children, built for display. */
interface TreeNode {
  node: NoteNode
  children: TreeNode[]
}

function buildTree(notes: readonly NoteNode[]): TreeNode[] {
  const byParent = new Map<string | undefined, NoteNode[]>()
  for (const note of notes) {
    const key = note.parentId
    const bucket = byParent.get(key)
    if (bucket === undefined) byParent.set(key, [note])
    else bucket.push(note)
  }
  const walk = (parentId: string | undefined): TreeNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((node) => ({ node, children: walk(node.id) }))
  return walk(undefined)
}

/** The notes panel. */
export function NotePanel({ notes, onChange }: NotePanelProps) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [folderTitle, setFolderTitle] = useState('')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  const tree = useMemo(() => buildTree(notes), [notes])
  const selected = notes.find((note) => note.id === selectedId)

  const patch = (id: string, changes: Partial<NoteNode>): void => {
    onChange(notes.map((note) => (note.id === id ? { ...note, ...changes, updatedAt: Date.now() } : note)))
  }

  const nextOrder = (): number =>
    notes.reduce((max, row) => (row.order > max ? row.order : max), 0) + 1

  const addFolder = (): void => {
    const now = Date.now()
    const note: NoteNode = {
      id: `note_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      parentId: undefined,
      title: folderTitle.trim() === '' ? '新文件夹' : folderTitle.trim(),
      body: '',
      folder: true,
      order: nextOrder(),
      createdAt: now,
      updatedAt: now,
    }
    onChange([...notes, note])
    setFolderTitle('')
    setSelectedId(note.id)
  }

  const addNote = (): void => {
    const now = Date.now()
    const note: NoteNode = {
      id: `note_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      parentId: selected?.folder === true ? selected.id : undefined,
      title: '新笔记',
      body: '',
      folder: false,
      order: nextOrder(),
      createdAt: now,
      updatedAt: now,
    }
    onChange([...notes, note])
    setSelectedId(note.id)
  }

  const remove = (id: string): void => {
    // Removing a folder removes what is inside it: a child whose parent is
    // gone has nowhere to sit, and the host would demote it to the top
    // level, which is not what the user asked for.
    const doomed = new Set<string>([id])
    let grew = true
    while (grew) {
      grew = false
      for (const note of notes) {
        if (note.parentId !== undefined && doomed.has(note.parentId) && !doomed.has(note.id)) {
          doomed.add(note.id)
          grew = true
        }
      }
    }
    onChange(notes.filter((note) => !doomed.has(note.id)))
    if (selectedId !== undefined && doomed.has(selectedId)) setSelectedId(undefined)
  }

  const toggle = (id: string): void => {
    const next = new Set(collapsed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setCollapsed(next)
  }

  const renderNodes = (nodes: TreeNode[]) => (
    <div className={styles.section}>
      {nodes.map(({ node, children }) => {
        const isCollapsed = collapsed.has(node.id)
        return (
          <div key={node.id} className={styles.treeNode}>
            <div
              className={[styles.row, selectedId === node.id ? styles.rowActive : undefined].filter(Boolean).join(' ')}
              onClick={() => setSelectedId(node.id)}
            >
              {children.length > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  title={isCollapsed ? '展开' : '折叠'}
                  icon={isCollapsed ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
                  onClick={() => toggle(node.id)}
                />
              ) : (
                <span style={{ width: 24 }} />
              )}
              {node.folder ? <IconFolder size={12} className={styles.muted} /> : null}
              <span className={styles.rowTitle}>{node.title}</span>
              <Button
                size="sm"
                variant="ghost"
                title="删除"
                icon={<IconTrash size={12} />}
                onClick={() => remove(node.id)}
              />
            </div>
            {children.length > 0 && !isCollapsed ? (
              <div className={styles.treeChildren}>{renderNodes(children)}</div>
            ) : null}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <div className={styles.body}>
        {tree.length === 0 ? (
          <div className={styles.empty}>还没有笔记。先建一个文件夹。</div>
        ) : (
          renderNodes(tree)
        )}
        {selected !== undefined && !selected.folder ? (
          <div className={styles.section} style={{ marginTop: 10 }}>
            <Input
              value={selected.title}
              onChange={(event) => patch(selected.id, { title: event.currentTarget.value })}
            />
            <textarea
              className={styles.grow}
              value={selected.body}
              placeholder="用 markdown 写正文"
              rows={6}
              onChange={(event) => patch(selected.id, { body: event.currentTarget.value })}
            />
          </div>
        ) : null}
      </div>
      <div className={styles.composer}>
        <Input
          value={folderTitle}
          placeholder="新文件夹名"
          onChange={(event) => setFolderTitle(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addFolder()
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<IconFolder size={12} />}
          title="新建文件夹"
          onClick={addFolder}
        />
        <Button variant="primary" size="sm" icon={<IconPlus size={12} />} title="新建笔记" onClick={addNote} />
      </div>
    </>
  )
}
