export type Folder = {
  id: number
  name: string
  position: number
  created: number
  count: number
}

export type NoteMeta = {
  id: number
  folder_id: number | null
  title: string
  snippet: string
  pinned: boolean
  trashed: boolean
  trashed_at: number | null
  created: number
  updated: number
}
export type Note = NoteMeta & { body: string }

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

const json = (method: string, body?: unknown) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const api = {
  folders: () => fetch('/api/folders').then((r) => j<Folder[]>(r)),
  createFolder: (name: string) => fetch('/api/folders', json('POST', { name })).then((r) => j<Folder>(r)),
  renameFolder: (id: number, name: string) => fetch(`/api/folders/${id}`, json('PATCH', { name })).then((r) => j<Folder>(r)),
  deleteFolder: (id: number) => fetch(`/api/folders/${id}`, json('DELETE')).then((r) => j<{ ok: true }>(r)),

  notes: () => fetch('/api/notes').then((r) => j<NoteMeta[]>(r)),
  note: (id: number) => fetch(`/api/notes/${id}`).then((r) => j<Note>(r)),
  createNote: (folder_id: number | null) => fetch('/api/notes', json('POST', { folder_id, body: '' })).then((r) => j<Note>(r)),
  updateNote: (id: number, patch: { body?: string; folder_id?: number | null; pinned?: boolean }) =>
    fetch(`/api/notes/${id}`, json('PUT', patch)).then((r) => j<Note>(r)),
  trashNote: (id: number) => fetch(`/api/notes/${id}/trash`, json('POST')).then((r) => j<{ ok: true }>(r)),
  restoreNote: (id: number) => fetch(`/api/notes/${id}/restore`, json('POST')).then((r) => j<{ ok: true }>(r)),
  purgeNote: (id: number) => fetch(`/api/notes/${id}`, json('DELETE')).then((r) => j<{ ok: true }>(r)),
}
