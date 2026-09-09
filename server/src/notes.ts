import { z } from 'zod'
import { q, type Row } from './db.js'

// A note is just a blob of text. The first non-empty line is its title and the next bit of
// text is the snippet, the same way Apple Notes derives them. We compute both on the server so
// the list can render without shipping every full body to the client.
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

export const noteCreate = z.object({
  folder_id: z.number().int().nullable().default(null),
  body: z.string().max(200_000).default(''),
})
export type NoteCreate = z.infer<typeof noteCreate>

export const noteUpdate = z.object({
  folder_id: z.number().int().nullable().optional(),
  body: z.string().max(200_000).optional(),
  pinned: z.boolean().optional(),
})
export type NoteUpdate = z.infer<typeof noteUpdate>

const TITLE_MAX = 120
const SNIPPET_MAX = 120

export function titleOf(body: string): string {
  const line = body.split('\n').find((l) => l.trim().length > 0) ?? ''
  const clean = line.replace(/^#+\s*/, '').trim() // drop a leading markdown heading marker
  return clean.slice(0, TITLE_MAX)
}

function snippetOf(body: string): string {
  const lines = body.split('\n')
  const titleIdx = lines.findIndex((l) => l.trim().length > 0)
  if (titleIdx === -1) return ''
  const rest = lines
    .slice(titleIdx + 1)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(' ')
  return rest.slice(0, SNIPPET_MAX)
}

const metaFromRow = (r: Row): NoteMeta => ({
  id: r.id,
  folder_id: r.folder_id ?? null,
  title: titleOf(r.body) || 'New Note',
  snippet: snippetOf(r.body),
  pinned: !!r.pinned,
  trashed: !!r.trashed,
  trashed_at: r.trashed_at ?? null,
  created: r.created,
  updated: r.updated,
})

const noteFromRow = (r: Row): Note => ({ ...metaFromRow(r), body: r.body })

// The list only needs metadata. We sort pinned first, then by most recently edited.
export function listNotes(): NoteMeta[] {
  const rows = q.all('SELECT * FROM notes ORDER BY pinned DESC, updated DESC')
  return rows.map(metaFromRow)
}

export function getNote(id: number): Note | null {
  const r = q.get('SELECT * FROM notes WHERE id = ?', id)
  return r ? noteFromRow(r) : null
}

export function createNote(input: NoteCreate): Note {
  const now = Date.now()
  const { lastInsertRowid } = q.run(
    'INSERT INTO notes (folder_id, body, created, updated) VALUES (?, ?, ?, ?)',
    input.folder_id,
    input.body,
    now,
    now,
  )
  return getNote(lastInsertRowid)!
}

export function updateNote(id: number, input: NoteUpdate): Note | null {
  const existing = q.get('SELECT * FROM notes WHERE id = ?', id)
  if (!existing) return null

  const sets: string[] = []
  const args: any[] = []
  if (input.body !== undefined) {
    sets.push('body = ?')
    args.push(input.body)
  }
  if (input.folder_id !== undefined) {
    sets.push('folder_id = ?')
    args.push(input.folder_id)
  }
  if (input.pinned !== undefined) {
    sets.push('pinned = ?')
    args.push(input.pinned ? 1 : 0)
  }
  // Only a body edit counts as touching the note, so moving or pinning keeps its place in the list.
  if (input.body !== undefined) {
    sets.push('updated = ?')
    args.push(Date.now())
  }
  if (!sets.length) return noteFromRow(existing)

  args.push(id)
  q.run(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, ...args)
  return getNote(id)
}

export function trashNote(id: number): boolean {
  return q.run('UPDATE notes SET trashed = 1, trashed_at = ? WHERE id = ? AND trashed = 0', Date.now(), id).changes > 0
}

export function restoreNote(id: number): boolean {
  return q.run('UPDATE notes SET trashed = 0, trashed_at = NULL WHERE id = ? AND trashed = 1', id).changes > 0
}

// Permanent delete, used from Recently Deleted or "delete forever".
export function purgeNote(id: number): boolean {
  return q.run('DELETE FROM notes WHERE id = ?', id).changes > 0
}
