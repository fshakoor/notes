import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Sidebar from './components/Sidebar'
import NoteList from './components/NoteList'
import Editor from './components/Editor'
import SettingsSheet from './components/SettingsSheet'
import { IconChevron, IconFolder } from './components/icons'
import { useStore } from './lib/useStore'
import { useTheme } from './lib/theme'

export default function App() {
  const store = useStore()
  const { theme, update } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [pane, setPane] = useState<'list' | 'editor'>('list') // which column shows on a phone
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = store.notes.find((n) => n.id === store.selectedId) ?? null
  const allCount = store.notes.filter((n) => !n.trashed).length
  const trashCount = store.notes.filter((n) => n.trashed).length

  const openNote = (id: number) => {
    store.setSelectedId(id)
    setPane('editor')
  }
  const newNote = async () => {
    await store.newNote()
    setPane('editor')
    setDrawer(false)
  }

  // global shortcuts: new note, focus search, close overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const typing = e.target instanceof HTMLElement && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')
      if (mod && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        void newNote()
      } else if ((mod && (e.key === 'f' || e.key === 'F')) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPane('list')
        searchRef.current?.focus()
      } else if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false)
        else if (drawer) setDrawer(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen, drawer])

  return (
    <div className="h-full w-full overflow-hidden text-[var(--color-ink)]">
      {/* desktop: three resizable-feel columns. mobile: one pane at a time with a drawer. */}
      <div className="grid h-full grid-cols-1 md:grid-cols-[13.5rem_20rem_1fr]">
        {/* sidebar: a fixed column on desktop, a slide-over on mobile */}
        <div
          className={clsx(
            'z-40 h-full border-r border-[var(--color-line)] md:static md:block md:translate-x-0',
            'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-64 max-md:transition-transform',
            drawer ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
          )}
        >
          <Sidebar
            folders={store.folders}
            view={store.view}
            allCount={allCount}
            trashCount={trashCount}
            onSelect={(v) => {
              store.setView(v)
              store.setSelectedId(null)
              setPane('list')
              setDrawer(false)
            }}
            onNewNote={newNote}
            onAddFolder={store.addFolder}
            onRenameFolder={store.renameFolder}
            onDeleteFolder={store.deleteFolder}
            onOpenSettings={() => {
              setSettingsOpen(true)
              setDrawer(false)
            }}
          />
        </div>
        {drawer && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setDrawer(false)} />}

        {/* note list */}
        <div className={clsx('h-full min-h-0 border-r border-[var(--color-line)]', pane === 'list' ? 'block' : 'hidden md:block')}>
          <div className="flex h-full flex-col">
            <button
              onClick={() => setDrawer(true)}
              className="press mx-3 mt-2 hidden items-center gap-1.5 self-start rounded-md px-2 py-1 text-[12.5px] text-[var(--color-dim)] hover:bg-[var(--color-surface2)] max-md:flex"
            >
              <IconFolder className="text-[14px]" /> Folders
            </button>
            <div className="min-h-0 flex-1">
              <NoteList
                notes={store.visible}
                folders={store.folders}
                view={store.view}
                selectedId={store.selectedId}
                query={store.query}
                searchRef={searchRef}
                onQuery={store.setQuery}
                onSelect={openNote}
                onNewNote={newNote}
                onPin={store.setPinned}
                onTrash={store.trashNote}
                onRestore={store.restoreNote}
                onPurge={store.purgeNote}
              />
            </div>
          </div>
        </div>

        {/* editor */}
        <div className={clsx('h-full min-h-0', pane === 'editor' ? 'block' : 'hidden md:block')}>
          <div className="flex h-full flex-col">
            <button
              onClick={() => setPane('list')}
              className="press mx-3 mt-2 hidden items-center gap-1 self-start rounded-md px-2 py-1 text-[12.5px] text-[var(--color-dim)] hover:bg-[var(--color-surface2)] max-md:flex"
            >
              <IconChevron className="rotate-180 text-[14px]" /> Notes
            </button>
            <div className="min-h-0 flex-1">
              <Editor
                note={selected}
                inTrash={store.view.kind === 'trash'}
                onSaveBody={store.saveBody}
                onPin={store.setPinned}
                onTrash={store.trashNote}
                onRestore={store.restoreNote}
                onPurge={store.purgeNote}
              />
            </div>
          </div>
        </div>
      </div>

      {settingsOpen && <SettingsSheet theme={theme} update={update} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
