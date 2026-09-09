import { useEffect, useMemo, useRef, useState } from 'react'
import type { NoteMeta } from '../lib/api'
import { api } from '../lib/api'
import { editedAt } from '../lib/format'
import { handleEditorKeydown } from '../lib/editor'
import { renderMarkdown } from '../lib/markdown'
import { IconChecklist, IconEye, IconPin, IconRestore, IconTrash } from './icons'

type Props = {
  note: NoteMeta | null
  inTrash: boolean
  onSaveBody: (id: number, body: string) => void
  onPin: (id: number, pinned: boolean) => void
  onTrash: (id: number) => void
  onRestore: (id: number) => void
  onPurge: (id: number) => void
}

const SAVE_DELAY = 450

export default function Editor({ note, inTrash, onSaveBody, onPin, onTrash, onRestore, onPurge }: Props) {
  const noteId = note?.id ?? null
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // refs so the debounce and the note-switch flush see current values without re-subscribing
  const idRef = useRef<number | null>(null)
  const bodyRef = useRef('')
  const savedRef = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  bodyRef.current = body

  const flush = () => {
    clearTimeout(timer.current)
    if (idRef.current != null && bodyRef.current !== savedRef.current) {
      savedRef.current = bodyRef.current
      onSaveBody(idRef.current, bodyRef.current)
    }
  }

  // load the full body when the selected note changes; flush the previous note on the way out
  useEffect(() => {
    if (noteId == null) {
      idRef.current = null
      setBody('')
      return
    }
    let alive = true
    setLoading(true)
    setPreview(false)
    api.note(noteId).then((n) => {
      if (!alive) return
      idRef.current = n.id
      savedRef.current = n.body
      setBody(n.body)
      setLoading(false)
      if (!inTrash) requestAnimationFrame(() => taRef.current?.focus())
    })
    return () => {
      alive = false
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  // save on tab close too
  useEffect(() => {
    const onLeave = () => flush()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChange = (v: string) => {
    setBody(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }

  const insertChecklist = () => {
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    const { selectionStart } = ta
    const atLineStart = selectionStart === 0 || body[selectionStart - 1] === '\n'
    const text = (atLineStart ? '' : '\n') + '- [ ] '
    ta.setSelectionRange(selectionStart, selectionStart)
    document.execCommand('insertText', false, text)
  }

  const html = useMemo(() => (preview ? renderMarkdown(body) : ''), [preview, body])

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-bg)]">
        <p className="text-[13px] text-[var(--color-faint)]">Select a note, or press ⌘N to start a new one.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)]">
      <div
        className="flex items-center gap-1 px-4 py-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex-1 truncate text-center text-[11.5px] text-[var(--color-faint)]">
          {note.updated ? editedAt(note.updated) : ''}
        </div>
        {!inTrash && (
          <>
            <ToolButton title="Checklist" onClick={insertChecklist}>
              <IconChecklist />
            </ToolButton>
            <ToolButton title={preview ? 'Edit' : 'Preview'} active={preview} onClick={() => setPreview((p) => !p)}>
              <IconEye />
            </ToolButton>
            <ToolButton title={note.pinned ? 'Unpin' : 'Pin'} active={note.pinned} onClick={() => onPin(note.id, !note.pinned)}>
              <IconPin />
            </ToolButton>
            <ToolButton title="Delete" onClick={() => onTrash(note.id)}>
              <IconTrash />
            </ToolButton>
          </>
        )}
      </div>

      {inTrash && (
        <div className="mx-4 mb-1 flex items-center justify-between rounded-lg bg-[var(--color-surface)] px-3 py-2 text-[12.5px] text-[var(--color-dim)]">
          <span>This note is in Recently Deleted.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRestore(note.id)}
              className="press flex items-center gap-1.5 rounded-md px-2 py-1 text-[var(--color-ink)] hover:bg-[var(--color-surface2)]"
            >
              <IconRestore className="text-[14px]" /> Restore
            </button>
            <button
              onClick={() => onPurge(note.id)}
              className="press flex items-center gap-1.5 rounded-md px-2 py-1 text-[#f26565] hover:bg-[var(--color-surface2)]"
            >
              <IconTrash className="text-[14px]" /> Delete Forever
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto h-full max-w-[46rem] px-6 pb-24 pt-2 sm:px-10">
          {loading ? null : preview ? (
            <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <textarea
              ref={taRef}
              value={body}
              readOnly={inTrash}
              spellCheck
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => handleEditorKeydown(e)}
              placeholder="Start writing..."
              className="editor"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ToolButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        'press grid h-8 w-8 place-items-center rounded-md text-[16px] ' +
        (active ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-dim)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-ink)]')
      }
    >
      {children}
    </button>
  )
}
