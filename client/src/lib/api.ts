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

// Only send a JSON content-type when there's actually a body. Fastify rejects an empty body that
// claims to be application/json, which would otherwise break the bodyless action routes below.
const req = (method: string, body?: unknown): RequestInit =>
  body === undefined
    ? { method }
    : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }

export const api = {
  folders: () => fetch('/api/folders').then((r) => j<Folder[]>(r)),
  createFolder: (name: string) => fetch('/api/folders', req('POST', { name })).then((r) => j<Folder>(r)),
  renameFolder: (id: number, name: string) => fetch(`/api/folders/${id}`, req('PATCH', { name })).then((r) => j<Folder>(r)),
  deleteFolder: (id: number) => fetch(`/api/folders/${id}`, req('DELETE')).then((r) => j<{ ok: true }>(r)),

  notes: () => fetch('/api/notes').then((r) => j<NoteMeta[]>(r)),
  note: (id: number) => fetch(`/api/notes/${id}`).then((r) => j<Note>(r)),
  createNote: (folder_id: number | null) => fetch('/api/notes', req('POST', { folder_id, body: '' })).then((r) => j<Note>(r)),
  updateNote: (id: number, patch: { body?: string; folder_id?: number | null; pinned?: boolean }) =>
    fetch(`/api/notes/${id}`, req('PUT', patch)).then((r) => j<Note>(r)),
  trashNote: (id: number) => fetch(`/api/notes/${id}/trash`, req('POST')).then((r) => j<{ ok: true }>(r)),
  restoreNote: (id: number) => fetch(`/api/notes/${id}/restore`, req('POST')).then((r) => j<{ ok: true }>(r)),
  purgeNote: (id: number) => fetch(`/api/notes/${id}`, req('DELETE')).then((r) => j<{ ok: true }>(r)),
}
