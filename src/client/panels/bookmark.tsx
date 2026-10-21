/**
 * The bookmarks panel.
 *
 * A flat list of links. Clicking one opens it in the browser — the only
 * cross-panel link the workbench has. The panel does not fetch the page: it
 * hands the URL to the browser, which is what the user asked for by clicking
 * a bookmark, and which keeps the plugin out of the request path.
 */
import { useState } from 'react'
import type { Bookmark } from '../../shared/types.ts'
import { Button, Input } from '../controls.tsx'
import { IconBookmark, IconPlus, IconTrash } from '../icons.tsx'
import styles from '../workbench.module.css'

/** The panel's props. */
export interface BookmarkPanelProps {
  /** The bookmarks to show. */
  bookmarks: readonly Bookmark[]
  /** Called when the list changes. */
  onChange: (next: Bookmark[]) => void
}

/** Whether a string is an http(s) URL. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** The bookmarks panel. */
export function BookmarkPanel({ bookmarks, onChange }: BookmarkPanelProps) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  const rows = [...bookmarks].sort((a, b) => a.order - b.order)

  const add = (): void => {
    const target = url.trim()
    if (target === '' || !isHttpUrl(target)) return
    const now = Date.now()
    const bookmark: Bookmark = {
      id: `bm_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      url: target,
      title: label.trim() === '' ? undefined : label.trim(),
      order: bookmarks.reduce((max, row) => (row.order > max ? row.order : max), 0) + 1,
      createdAt: now,
      updatedAt: now,
    }
    onChange([...bookmarks, bookmark])
    setUrl('')
    setLabel('')
  }

  const remove = (id: string): void => {
    onChange(bookmarks.filter((bookmark) => bookmark.id !== id))
  }

  return (
    <>
      <div className={styles.body}>
        {rows.length === 0 ? (
          <div className={styles.empty}>还没有书签。</div>
        ) : (
          <div className={styles.section}>
            {rows.map((bookmark) => (
              <div key={bookmark.id} className={styles.row}>
                <IconBookmark size={12} className={styles.muted} />
                <div className={styles.grow}>
                  <button
                    type="button"
                    className={styles.rowTitle}
                    style={{ background: 'none', border: 'none', textAlign: 'left', color: 'inherit', cursor: 'pointer' }}
                    title={bookmark.url}
                    onClick={() => {
                      window.open(bookmark.url, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    {bookmark.title ?? bookmark.url}
                  </button>
                  {bookmark.title !== undefined ? <div className={styles.muted}>{bookmark.url}</div> : null}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  title="删除"
                  icon={<IconTrash size={12} />}
                  onClick={() => remove(bookmark.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.composer}>
        <Input
          value={url}
          placeholder="https://"
          onChange={(event) => setUrl(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') add()
          }}
        />
        <Input value={label} placeholder="标题（可选）" onChange={(event) => setLabel(event.currentTarget.value)} />
        <Button variant="primary" size="sm" icon={<IconPlus size={12} />} title="添加" onClick={add} />
      </div>
    </>
  )
}
