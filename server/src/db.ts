import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

// DB path is env-overridable (NOTES_DB) so a scratch instance can run without touching real data.
const dbPath = process.env.NOTES_DB
  ? path.resolve(process.env.NOTES_DB)
  : path.join(path.resolve(import.meta.dirname, '../data'), 'notes.db')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
CREATE TABLE IF NOT EXISTS folders (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT    NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,  -- sort order in the sidebar
  created  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id  INTEGER REFERENCES folders(id) ON DELETE SET NULL,  -- null = unfiled
  body       TEXT    NOT NULL DEFAULT '',
  pinned     INTEGER NOT NULL DEFAULT 0,
  trashed    INTEGER NOT NULL DEFAULT 0,  -- 1 = in Recently Deleted
  trashed_at INTEGER,                     -- when it was moved to the trash
  created    INTEGER NOT NULL,
  updated    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated);
`)

export type Row = Record<string, any>

// Thin helpers so callers don't touch the raw statement API everywhere.
export const q = {
  all: (sql: string, ...args: any[]): Row[] => db.prepare(sql).all(...args) as Row[],
  get: (sql: string, ...args: any[]): Row | undefined => db.prepare(sql).get(...args) as Row | undefined,
  run: (sql: string, ...args: any[]) => {
    const r = db.prepare(sql).run(...args)
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }
  },
}
