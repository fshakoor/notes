// A small editing engine that gives a plain <textarea> the feel of a code editor: indent and
// dedent, list continuation, move/duplicate/delete line, smart home, and markdown wrapping.
//
// Every mutation goes through execCommand('insertText'), which is the one way to change a
// textarea while keeping the browser's native undo/redo stack. That is what makes typing feel
// like Sublime rather than a form field: Cmd+Z walks back through real edits, one step at a time.

const INDENT = '  ' // two spaces per level

type TA = HTMLTextAreaElement

/** Replace [start, end) with text, preserving native undo, then place the caret. */
function replace(ta: TA, start: number, end: number, text: string, caretStart: number, caretEnd = caretStart) {
  ta.focus()
  ta.setSelectionRange(start, end)
  const ok = document.execCommand('insertText', false, text)
  if (!ok) {
    // fallback for engines without execCommand; loses the native undo step but keeps working
    ta.setRangeText(text, start, end, 'end')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }
  ta.setSelectionRange(caretStart, caretEnd)
}

// Line boundaries in the value that fully contain the current selection.
function lineSpan(value: string, from: number, to: number) {
  const start = value.lastIndexOf('\n', from - 1) + 1
  let end = value.indexOf('\n', to)
  if (end === -1) end = value.length
  return { start, end }
}

function currentLine(value: string, caret: number) {
  const start = value.lastIndexOf('\n', caret - 1) + 1
  let end = value.indexOf('\n', caret)
  if (end === -1) end = value.length
  return { start, end, text: value.slice(start, end) }
}

function indent(ta: TA) {
  const { value, selectionStart: s, selectionEnd: e } = ta
  if (s === e) {
    replace(ta, s, e, INDENT, s + INDENT.length)
    return
  }
  const span = lineSpan(value, s, e)
  const block = value.slice(span.start, span.end)
  const next = block.replace(/^/gm, INDENT)
  replace(ta, span.start, span.end, next, span.start, span.start + next.length)
}

function dedent(ta: TA) {
  const { value, selectionStart: s, selectionEnd: e } = ta
  const span = lineSpan(value, s, e)
  const block = value.slice(span.start, span.end)
  const next = block.replace(/^(\t| {1,2})/gm, '')
  replace(ta, span.start, span.end, next, span.start, span.start + next.length)
}

// Enter: continue a list marker or the current indentation. Returns true if it did something.
function newline(ta: TA): boolean {
  const { value, selectionStart: s, selectionEnd: e } = ta
  if (s !== e) return false
  const { start, text } = currentLine(value, s)
  const beforeCaret = value.slice(start, s)

  const checkbox = beforeCaret.match(/^(\s*)([-*+])\s+\[[ xX]\]\s+/)
  const bullet = beforeCaret.match(/^(\s*)([-*+])\s+/)
  const ordered = beforeCaret.match(/^(\s*)(\d+)([.)])\s+/)
  const indented = beforeCaret.match(/^(\s+)/)

  // An empty list item ends the list: clear the marker instead of adding another.
  const emptyItem = (checkbox || bullet || ordered) && text.trim().length <= (checkbox || bullet || ordered)![0].trim().length
  if (emptyItem) {
    replace(ta, start, s, '', start)
    return true
  }

  let prefix = ''
  if (checkbox) prefix = `${checkbox[1]}${checkbox[2]} [ ] `
  else if (bullet) prefix = `${bullet[1]}${bullet[2]} `
  else if (ordered) prefix = `${ordered[1]}${Number(ordered[2]) + 1}${ordered[3]} `
  else if (indented) prefix = indented[1]
  else return false

  const insert = '\n' + prefix
  replace(ta, s, e, insert, s + insert.length)
  return true
}

function moveLines(ta: TA, dir: -1 | 1) {
  const { value, selectionStart: s, selectionEnd: e } = ta
  const span = lineSpan(value, s, e)
  if (dir === -1 && span.start === 0) return
  if (dir === 1 && span.end === value.length) return

  const block = value.slice(span.start, span.end)
  if (dir === -1) {
    const prevStart = value.lastIndexOf('\n', span.start - 2) + 1
    const prev = value.slice(prevStart, span.start - 1)
    const next = block + '\n' + prev
    replace(ta, prevStart, span.end, next, prevStart + (s - span.start), prevStart + (e - span.start))
  } else {
    const nextEnd = (() => {
      const i = value.indexOf('\n', span.end + 1)
      return i === -1 ? value.length : i
    })()
    const nextLine = value.slice(span.end + 1, nextEnd)
    const combined = nextLine + '\n' + block
    const shift = nextLine.length + 1
    replace(ta, span.start, nextEnd, combined, span.start + shift + (s - span.start), span.start + shift + (e - span.start))
  }
}

function duplicateLines(ta: TA) {
  const { value, selectionStart: s, selectionEnd: e } = ta
  const span = lineSpan(value, s, e)
  const block = value.slice(span.start, span.end)
  replace(ta, span.end, span.end, '\n' + block, s + block.length + 1, e + block.length + 1)
}

function deleteLines(ta: TA) {
  const { value, selectionStart: s, selectionEnd: e } = ta
  const span = lineSpan(value, s, e)
  const from = span.start
  const to = span.end < value.length ? span.end + 1 : span.end
  // if we're on the last line, also eat the newline before it so nothing is left dangling
  const start = to === span.end && span.start > 0 ? span.start - 1 : from
  replace(ta, start, to, '', start)
}

function smartHome(ta: TA, extend: boolean) {
  const { value, selectionStart: s } = ta
  const { start, text } = currentLine(value, s)
  const firstNonWs = start + (text.match(/^\s*/)?.[0].length ?? 0)
  const target = s === firstNonWs ? start : firstNonWs
  if (extend) ta.setSelectionRange(Math.min(target, ta.selectionEnd), Math.max(target, ta.selectionEnd))
  else ta.setSelectionRange(target, target)
}

// Wrap the selection with a marker (or insert an empty pair and sit the caret inside).
function wrap(ta: TA, marker: string) {
  const { value, selectionStart: s, selectionEnd: e } = ta
  const sel = value.slice(s, e)
  const len = marker.length
  // toggle off if the selection is already wrapped
  if (sel.startsWith(marker) && sel.endsWith(marker) && sel.length >= len * 2) {
    const inner = sel.slice(len, sel.length - len)
    replace(ta, s, e, inner, s, s + inner.length)
    return
  }
  const next = marker + sel + marker
  replace(ta, s, e, next, s + len, e + len)
}

const mod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey

/** Handle an editor keydown. Returns true if the key was consumed. */
export function handleEditorKeydown(e: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
  const ta = e.currentTarget
  const key = e.key

  if (key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) dedent(ta)
    else indent(ta)
    return true
  }
  if (key === 'Enter' && !mod(e) && !e.shiftKey) {
    if (newline(ta)) {
      e.preventDefault()
      return true
    }
    return false
  }
  if (e.altKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
    e.preventDefault()
    moveLines(ta, key === 'ArrowUp' ? -1 : 1)
    return true
  }
  if (mod(e) && e.shiftKey && (key === 'd' || key === 'D')) {
    e.preventDefault()
    duplicateLines(ta)
    return true
  }
  if (mod(e) && e.shiftKey && (key === 'k' || key === 'K')) {
    e.preventDefault()
    deleteLines(ta)
    return true
  }
  if (key === 'Home') {
    e.preventDefault()
    smartHome(ta, e.shiftKey)
    return true
  }
  if (mod(e) && (key === 'b' || key === 'B')) {
    e.preventDefault()
    wrap(ta, '**')
    return true
  }
  if (mod(e) && (key === 'i' || key === 'I')) {
    e.preventDefault()
    wrap(ta, '*')
    return true
  }
  return false
}
