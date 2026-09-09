import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type Folder, type Note, type NoteMeta } from './api'

// A personal notes app is small, so the list metadata for every note lives in memory. Full bodies
// are fetched on demand when a note is opened. Mutations update local state right away and fall
// back to a reload if the server disagrees.

export type View = { kind: 'all' } | { kind: 'trash' } | { kind: 'folder'; id: number }

export function useStore() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [view, setView] = useState<View>({ kind: 'all' })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [f, n] = await Promise.all([api.folders(), api.notes()])
    setFolders(f)
    setNotes(n)
    setLoading(false)
    return n
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // notes visible under the current view (folder / all / trash) and search query
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes.filter((n) => {
      if (view.kind === 'trash') {
        if (!n.trashed) return false
      } else {
        if (n.trashed) return false
        if (view.kind === 'folder' && n.folder_id !== view.id) return false
      }
      if (!q) return true
      return n.title.toLowerCase().includes(q) || n.snippet.toLowerCase().includes(q)
    })
  }, [notes, view, query])

  const applyMeta = (note: Note) =>
    setNotes((prev) => {
      const meta: NoteMeta = { ...note }
      const idx = prev.findIndex((n) => n.id === note.id)
      const next = idx === -1 ? [...prev, meta] : prev.map((n) => (n.id === note.id ? meta : n))
      return next.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
    })

  const newNote = useCallback(async () => {
    const folder_id = view.kind === 'folder' ? view.id : null
    const note = await api.createNote(folder_id)
    applyMeta(note)
    setSelectedId(note.id)
    return note
  }, [view])

  const saveBody = useCallback(async (id: number, body: string) => {
    const note = await api.updateNote(id, { body })
    applyMeta(note)
  }, [])

  const setPinned = useCallback(async (id: number, pinned: boolean) => {
    const note = await api.updateNote(id, { pinned })
    applyMeta(note)
  }, [])

  const moveNote = useCallback(async (id: number, folder_id: number | null) => {
    const note = await api.updateNote(id, { folder_id })
    applyMeta(note)
    setFolders(await api.folders())
  }, [])

  const trashNote = useCallback(
    async (id: number) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, trashed: true } : n)))
      if (selectedId === id) setSelectedId(null)
      await api.trashNote(id)
      setFolders(await api.folders())
    },
    [selectedId],
  )

  const restoreNote = useCallback(async (id: number) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, trashed: false } : n)))
    await api.restoreNote(id)
    setFolders(await api.folders())
  }, [])

  const purgeNote = useCallback(
    async (id: number) => {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (selectedId === id) setSelectedId(null)
      await api.purgeNote(id)
    },
    [selectedId],
  )

  const addFolder = useCallback(async (name: string) => {
    const folder = await api.createFolder(name)
    setFolders((prev) => [...prev, folder])
    setView({ kind: 'folder', id: folder.id })
    return folder
  }, [])

  const renameFolder = useCallback(async (id: number, name: string) => {
    const folder = await api.renameFolder(id, name)
    setFolders((prev) => prev.map((f) => (f.id === id ? folder : f)))
  }, [])

  const deleteFolder = useCallback(
    async (id: number) => {
      await api.deleteFolder(id)
      setView((v) => (v.kind === 'folder' && v.id === id ? { kind: 'all' } : v))
      await reload()
    },
    [reload],
  )

  return {
    folders,
    notes,
    visible,
    view,
    setView,
    selectedId,
    setSelectedId,
    query,
    setQuery,
    loading,
    reload,
    newNote,
    saveBody,
    setPinned,
    moveNote,
    trashNote,
    restoreNote,
    purgeNote,
    addFolder,
    renameFolder,
    deleteFolder,
  }
}
