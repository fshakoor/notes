import path from 'node:path'
import fs from 'node:fs'
import dotenv from 'dotenv'
// load repo-root .env explicitly (the server is launched from the workspace dir)
dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })

import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { createFolder, deleteFolder, folderInput, listFolders, renameFolder } from './folders.js'
import {
  createNote,
  getNote,
  listNotes,
  noteCreate,
  noteUpdate,
  purgeNote,
  restoreNote,
  trashNote,
  updateNote,
} from './notes.js'

const app = Fastify({ logger: false })

app.get('/api/health', async () => ({ ok: true }))

// folders
app.get('/api/folders', async () => listFolders())

app.post('/api/folders', async (req, reply) => {
  const parsed = folderInput.safeParse(req.body)
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'invalid' })
  return createFolder(parsed.data)
})

app.patch('/api/folders/:id', async (req, reply) => {
  const id = Number((req.params as { id: string }).id)
  const parsed = folderInput.safeParse(req.body)
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'invalid' })
  const folder = renameFolder(id, parsed.data)
  if (!folder) return reply.code(404).send({ error: 'not found' })
  return folder
})

app.delete('/api/folders/:id', async (req, reply) => {
  const id = Number((req.params as { id: string }).id)
  if (!deleteFolder(id)) return reply.code(404).send({ error: 'not found' })
  return { ok: true }
})

// notes
app.get('/api/notes', async () => listNotes())

app.get('/api/notes/:id', async (req, reply) => {
  const id = Number((req.params as { id: string }).id)
  const note = getNote(id)
  if (!note) return reply.code(404).send({ error: 'not found' })
  return note
})

app.post('/api/notes', async (req, reply) => {
  const parsed = noteCreate.safeParse(req.body ?? {})
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'invalid' })
  return createNote(parsed.data)
})

app.put('/api/notes/:id', async (req, reply) => {
  const id = Number((req.params as { id: string }).id)
  const parsed = noteUpdate.safeParse(req.body)
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'invalid' })
  const note = updateNote(id, parsed.data)
  if (!note) return reply.code(404).send({ error: 'not found' })
  return note
})

app.post('/api/notes/:id/trash', async (req, reply) => {
  const id = Number((req.params as { id: string }).id)
  if (!trashNote(id)) return reply.code(404).send({ error: 'not found' })
  return { ok: true }
})

app.post('/api/notes/:id/restore', async (req, reply) => {
  const id = Number((req.params as { id: string }).id)
  if (!restoreNote(id)) return reply.code(404).send({ error: 'not found' })
  return { ok: true }
})

app.delete('/api/notes/:id', async (req, reply) => {
  const id = Number((req.params as { id: string }).id)
  if (!purgeNote(id)) return reply.code(404).send({ error: 'not found' })
  return { ok: true }
})

// serve the built client in production (single port over Tailscale)
const distDir = path.resolve(import.meta.dirname, '../../client/dist')
const hasDist = fs.existsSync(path.join(distDir, 'index.html'))
if (hasDist) {
  await app.register(fastifyStatic, { root: distDir })
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not found' })
    return reply.sendFile('index.html') // SPA fallback
  })
}

const port = Number(process.env.PORT || 5190)
// In prod (serving the client) bind on all interfaces so tailnet devices can reach it.
// In dev the API stays on localhost; the Vite client (host:true) proxies /api to it.
const host = process.env.HOST || (hasDist ? '0.0.0.0' : '127.0.0.1')

app.listen({ port, host }).then(() => {
  console.log(`[notes] api on http://${host}:${port}${hasDist ? '  (also serving the built client)' : ''}`)
})
