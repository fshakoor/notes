import { z } from 'zod'
import { q, type Row } from './db.js'

export type Folder = {
  id: number
  name: string
  position: number
  created: number
  count: number // live notes in the folder (trashed ones excluded)
}

export const folderInput = z.object({
  name: z.string().trim().min(1).max(80),
})
export type FolderInput = z.infer<typeof folderInput>

const rowToFolder = (r: Row): Folder => ({
  id: r.id,
  name: r.name,
  position: r.position,
  created: r.created,
  count: r.count ?? 0,
})

export function listFolders(): Folder[] {
  const rows = q.all(`
    SELECT f.*, (
      SELECT COUNT(*) FROM notes n WHERE n.folder_id = f.id AND n.trashed = 0
    ) AS count
    FROM folders f
    ORDER BY f.position, f.id
  `)
  return rows.map(rowToFolder)
}

export function createFolder(input: FolderInput): Folder {
  const now = Date.now()
  const next = q.get('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM folders')?.p ?? 1
  const { lastInsertRowid } = q.run(
    'INSERT INTO folders (name, position, created) VALUES (?, ?, ?)',
    input.name,
    next,
    now,
  )
  return rowToFolder(q.get('SELECT *, 0 AS count FROM folders WHERE id = ?', lastInsertRowid)!)
}

export function renameFolder(id: number, input: FolderInput): Folder | null {
  const changed = q.run('UPDATE folders SET name = ? WHERE id = ?', input.name, id)
  if (!changed.changes) return null
  const row = q.get(
    'SELECT f.*, (SELECT COUNT(*) FROM notes n WHERE n.folder_id = f.id AND n.trashed = 0) AS count FROM folders f WHERE f.id = ?',
    id,
  )
  return row ? rowToFolder(row) : null
}

// Deleting a folder sends its notes to Recently Deleted rather than dropping them.
export function deleteFolder(id: number): boolean {
  const now = Date.now()
  q.run('UPDATE notes SET trashed = 1, trashed_at = ?, folder_id = NULL WHERE folder_id = ? AND trashed = 0', now, id)
  return q.run('DELETE FROM folders WHERE id = ?', id).changes > 0
}
