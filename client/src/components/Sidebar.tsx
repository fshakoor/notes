import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Folder } from '../lib/api'
import type { View } from '../lib/useStore'
import { IconFolder, IconMore, IconNewNote, IconPlus, IconSettings, IconTrash } from './icons'

type Props = {
  folders: Folder[]
  view: View
  allCount: number
  trashCount: number
  onSelect: (view: View) => void
  onNewNote: () => void
  onAddFolder: (name: string) => Promise<Folder>
  onRenameFolder: (id: number, name: string) => void
  onDeleteFolder: (id: number) => void
  onOpenSettings: () => void
}

export default function Sidebar({
  folders,
  view,
  allCount,
  trashCount,
  onSelect,
  onNewNote,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenSettings,
}: Props) {
  const [editing, setEditing] = useState<number | null>(null)

  const rowBase =
    'group flex items-center gap-2.5 w-full rounded-lg px-2.5 py-1.5 text-[13px] press select-none'

  return (
    <aside className="flex h-full w-full flex-col bg-[var(--color-surface)]">
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <span className="eyebrow">Notes</span>
        <button
          onClick={onNewNote}
          title="New note"
          className="press grid h-7 w-7 place-items-center rounded-md text-[15px] text-[var(--color-dim)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-ink)]"
        >
          <IconNewNote />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <button
          onClick={() => onSelect({ kind: 'all' })}
          className={clsx(rowBase, view.kind === 'all' ? 'bg-[var(--color-surface3)] text-[var(--color-ink)]' : 'text-[var(--color-dim)] hover:bg-[var(--color-surface2)]')}
        >
          <IconFolder className="text-[16px] opacity-80" />
          <span className="flex-1 text-left">All Notes</span>
          <span className="num text-[12px] text-[var(--color-faint)]">{allCount || ''}</span>
        </button>

        <div className="mt-3 mb-1 flex items-center justify-between px-2.5">
          <span className="eyebrow">Folders</span>
          <button
            onClick={async () => {
              const f = await onAddFolder('New Folder')
              setEditing(f.id)
            }}
            title="New folder"
            className="press grid h-5 w-5 place-items-center rounded text-[13px] text-[var(--color-faint)] hover:text-[var(--color-ink)]"
          >
            <IconPlus />
          </button>
        </div>

        {folders.map((f) => (
          <FolderRow
            key={f.id}
            folder={f}
            active={view.kind === 'folder' && view.id === f.id}
            editing={editing === f.id}
            rowBase={rowBase}
            onSelect={() => onSelect({ kind: 'folder', id: f.id })}
            onStartRename={() => setEditing(f.id)}
            onRename={(name) => {
              setEditing(null)
              if (name.trim()) onRenameFolder(f.id, name.trim())
            }}
            onDelete={() => onDeleteFolder(f.id)}
          />
        ))}

        {folders.length === 0 && (
          <p className="px-2.5 py-1 text-[12px] text-[var(--color-faint)]">No folders yet</p>
        )}
      </div>

      <div className="border-t border-[var(--color-line)] p-2">
        <button
          onClick={() => onSelect({ kind: 'trash' })}
          className={clsx(rowBase, view.kind === 'trash' ? 'bg-[var(--color-surface3)] text-[var(--color-ink)]' : 'text-[var(--color-dim)] hover:bg-[var(--color-surface2)]')}
        >
          <IconTrash className="text-[16px] opacity-80" />
          <span className="flex-1 text-left">Recently Deleted</span>
          <span className="num text-[12px] text-[var(--color-faint)]">{trashCount || ''}</span>
        </button>
        <button
          onClick={onOpenSettings}
          className={clsx(rowBase, 'text-[var(--color-dim)] hover:bg-[var(--color-surface2)]')}
        >
          <IconSettings className="text-[16px] opacity-80" />
          <span className="flex-1 text-left">Settings</span>
        </button>
      </div>
    </aside>
  )
}

function FolderRow({
  folder,
  active,
  editing,
  rowBase,
  onSelect,
  onStartRename,
  onRename,
  onDelete,
}: {
  folder: Folder
  active: boolean
  editing: boolean
  rowBase: string
  onSelect: () => void
  onStartRename: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  if (editing) {
    return (
      <div className={clsx(rowBase, 'bg-[var(--color-surface2)]')}>
        <IconFolder className="text-[16px] opacity-80" />
        <input
          autoFocus
          defaultValue={folder.name}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={(e) => onRename(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') onRename(folder.name)
          }}
          className="flex-1 bg-transparent text-[13px] text-[var(--color-ink)] outline-none"
        />
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        onDoubleClick={onStartRename}
        className={clsx(
          rowBase,
          active ? 'bg-[var(--color-surface3)] text-[var(--color-ink)]' : 'text-[var(--color-dim)] hover:bg-[var(--color-surface2)]',
        )}
      >
        <IconFolder className="text-[16px] opacity-80" />
        <span className="flex-1 truncate text-left">{folder.name}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            setMenu((m) => !m)
          }}
          className="press hidden h-5 w-5 place-items-center rounded text-[13px] text-[var(--color-faint)] hover:text-[var(--color-ink)] group-hover:grid"
        >
          <IconMore />
        </span>
        <span className={clsx('num text-[12px] text-[var(--color-faint)]', 'group-hover:hidden')}>{folder.count || ''}</span>
      </button>

      {menu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-8 z-20 w-36 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface2)] p-1 shadow-xl"
        >
          <button
            onClick={() => {
              setMenu(false)
              onStartRename()
            }}
            className="press w-full rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-[var(--color-surface3)]"
          >
            Rename
          </button>
          <button
            onClick={() => {
              setMenu(false)
              onDelete()
            }}
            className="press w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-[#f26565] hover:bg-[var(--color-surface3)]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
