import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { Folder, NoteMeta } from '../lib/api'
import type { View } from '../lib/useStore'
import { listDate } from '../lib/format'
import { IconMore, IconNewNote, IconPin, IconRestore, IconSearch, IconTrash } from './icons'

type Props = {
  notes: NoteMeta[]
  folders: Folder[]
  view: View
  selectedId: number | null
  query: string
  searchRef: React.RefObject<HTMLInputElement>
  onQuery: (q: string) => void
  onSelect: (id: number) => void
  onNewNote: () => void
  onPin: (id: number, pinned: boolean) => void
  onTrash: (id: number) => void
  onRestore: (id: number) => void
  onPurge: (id: number) => void
}

const viewTitle = (view: View, folders: Folder[]) => {
  if (view.kind === 'all') return 'All Notes'
  if (view.kind === 'trash') return 'Recently Deleted'
  return folders.find((f) => f.id === view.id)?.name ?? 'Folder'
}

export default function NoteList(props: Props) {
  const { notes, folders, view, selectedId, query, searchRef, onQuery, onNewNote } = props
  const pinned = notes.filter((n) => n.pinned && !n.trashed)
  const rest = notes.filter((n) => !n.pinned || n.trashed)
  const inTrash = view.kind === 'trash'

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-surface)]">
      <div className="px-3 pt-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface2)] px-2.5 py-1.5 text-[var(--color-dim)]">
          <IconSearch className="text-[15px]" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-faint)]"
          />
          {query && (
            <button onClick={() => onQuery('')} className="press text-[12px] text-[var(--color-faint)] hover:text-[var(--color-ink)]">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{viewTitle(view, folders)}</h2>
        {!inTrash && (
          <button
            onClick={onNewNote}
            title="New note"
            className="press grid h-7 w-7 place-items-center rounded-md text-[15px] text-[var(--color-dim)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-ink)]"
          >
            <IconNewNote />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {notes.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-[var(--color-faint)]">
            {query ? 'Nothing matches your search.' : inTrash ? 'Recently Deleted is empty.' : 'No notes yet.'}
          </p>
        )}

        {pinned.length > 0 && !inTrash && (
          <>
            <div className="px-3 pb-1 pt-2 eyebrow">Pinned</div>
            {pinned.map((n) => (
              <Row key={n.id} note={n} {...props} active={n.id === selectedId} />
            ))}
            {rest.length > 0 && <div className="px-3 pb-1 pt-3 eyebrow">Notes</div>}
          </>
        )}

        {rest.map((n) => (
          <Row key={n.id} note={n} {...props} active={n.id === selectedId} />
        ))}
      </div>
    </div>
  )
}

function Row({
  note,
  folders,
  view,
  active,
  onSelect,
  onPin,
  onTrash,
  onRestore,
  onPurge,
}: Props & { note: NoteMeta; active: boolean }) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inTrash = view.kind === 'trash'
  const folder = note.folder_id != null ? folders.find((f) => f.id === note.folder_id) : null

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  return (
    <div className="relative">
      <button
        onClick={() => onSelect(note.id)}
        className={clsx(
          'group block w-full rounded-xl px-3 py-2 text-left press',
          active ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-surface2)]',
        )}
      >
        <div className="flex items-center gap-1.5">
          {note.pinned && !inTrash && <IconPin className="shrink-0 text-[12px] text-[var(--color-faint)]" />}
          <span className="flex-1 truncate text-[13.5px] font-semibold text-[var(--color-ink)]">{note.title || 'New Note'}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              setMenu((m) => !m)
            }}
            className="press hidden h-5 w-5 shrink-0 place-items-center rounded text-[13px] text-[var(--color-faint)] hover:text-[var(--color-ink)] group-hover:grid"
          >
            <IconMore />
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--color-faint)]">
          <span className="num shrink-0">{listDate(inTrash ? note.trashed_at ?? note.updated : note.updated)}</span>
          <span className="truncate text-[var(--color-dim)]">{note.snippet || 'No additional text'}</span>
        </div>
        {view.kind === 'all' && folder && (
          <div className="mt-1 inline-flex items-center gap-1 rounded text-[11px] text-[var(--color-faint)]">
            {folder.name}
          </div>
        )}
      </button>

      {menu && (
        <div
          ref={menuRef}
          className="absolute right-3 top-9 z-20 w-40 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface2)] p-1 shadow-xl"
        >
          {inTrash ? (
            <>
              <MenuItem icon={<IconRestore />} label="Restore" onClick={() => (setMenu(false), onRestore(note.id))} />
              <MenuItem
                icon={<IconTrash />}
                label="Delete Forever"
                danger
                onClick={() => (setMenu(false), onPurge(note.id))}
              />
            </>
          ) : (
            <>
              <MenuItem
                icon={<IconPin />}
                label={note.pinned ? 'Unpin' : 'Pin'}
                onClick={() => (setMenu(false), onPin(note.id, !note.pinned))}
              />
              <MenuItem icon={<IconTrash />} label="Delete" danger onClick={() => (setMenu(false), onTrash(note.id))} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'press flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-[var(--color-surface3)]',
        danger ? 'text-[#f26565]' : 'text-[var(--color-ink)]',
      )}
    >
      <span className="text-[15px] opacity-80">{icon}</span>
      {label}
    </button>
  )
}
