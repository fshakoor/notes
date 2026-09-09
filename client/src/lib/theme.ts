import { useState } from 'react'

// The whole UI runs off CSS variables, so a theme is just a set of values written onto the
// root element. Choices persist to localStorage and apply instantly, no reload.

export type ThemeMode = 'oled' | 'dark' | 'light'
export type AccentKey = 'mono' | 'blue' | 'green' | 'orange' | 'purple' | 'red'
export type EditorFont = 'mono' | 'sans' | 'serif'
export type Theme = { mode: ThemeMode; accent: AccentKey; editorFont: EditorFont; editorSize: number }

const KEY = 'notes-theme'
const DEFAULT: Theme = { mode: 'oled', accent: 'mono', editorFont: 'mono', editorSize: 15 }

const PRESETS: Record<ThemeMode, Record<string, string>> = {
  oled: {
    '--color-bg': '#000000',
    '--color-surface': '#0b0b0b',
    '--color-surface2': '#151515',
    '--color-surface3': '#1e1e1e',
    '--color-line': 'rgba(255,255,255,0.09)',
    '--color-line-strong': 'rgba(255,255,255,0.18)',
    '--color-ink': '#f4f4f4',
    '--color-dim': '#a0a0a0',
    '--color-faint': '#666666',
  },
  dark: {
    '--color-bg': '#161618',
    '--color-surface': '#1e1e21',
    '--color-surface2': '#26262a',
    '--color-surface3': '#313136',
    '--color-line': 'rgba(255,255,255,0.08)',
    '--color-line-strong': 'rgba(255,255,255,0.16)',
    '--color-ink': '#ececec',
    '--color-dim': '#98989f',
    '--color-faint': '#63636b',
  },
  light: {
    '--color-bg': '#ffffff',
    '--color-surface': '#f7f7f8',
    '--color-surface2': '#efeff0',
    '--color-surface3': '#e4e4e6',
    '--color-line': 'rgba(0,0,0,0.09)',
    '--color-line-strong': 'rgba(0,0,0,0.16)',
    '--color-ink': '#1a1a1c',
    '--color-dim': '#5b5b62',
    '--color-faint': '#8a8a92',
  },
}

type AccentVars = { accent: string; soft: string }
const ACCENTS: Record<Exclude<AccentKey, 'mono'>, AccentVars> = {
  blue: { accent: '#3b82f6', soft: 'rgba(59,130,246,0.16)' },
  green: { accent: '#22c55e', soft: 'rgba(34,197,94,0.16)' },
  orange: { accent: '#f97316', soft: 'rgba(249,115,22,0.16)' },
  purple: { accent: '#a855f7', soft: 'rgba(168,85,247,0.16)' },
  red: { accent: '#ef4444', soft: 'rgba(239,68,68,0.16)' },
}

const EDITOR_FONTS: Record<EditorFont, string> = {
  mono: "'JetBrains Mono Variable', ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace",
  sans: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "'Iowan Old Style', Georgia, 'Times New Roman', serif",
}

export function applyTheme(t: Theme) {
  const root = document.documentElement.style
  const preset = PRESETS[t.mode]
  for (const k in preset) root.setProperty(k, preset[k])

  if (t.accent === 'mono') {
    // monochrome accent tracks the text color so it reads on any background
    root.setProperty('--color-accent', preset['--color-ink'])
    root.setProperty('--color-accent-soft', t.mode === 'light' ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.11)')
  } else {
    const a = ACCENTS[t.accent]
    root.setProperty('--color-accent', a.accent)
    root.setProperty('--color-accent-soft', a.soft)
  }

  root.setProperty('--font-editor', EDITOR_FONTS[t.editorFont] || EDITOR_FONTS.mono)
  root.setProperty('--editor-size', `${t.editorSize}px`)
  // keep native controls (scrollbars, carets) in step with the theme
  document.documentElement.style.setProperty('color-scheme', t.mode === 'light' ? 'light' : 'dark')
}

export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    // ignore unreadable storage
  }
  return DEFAULT
}

function saveTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t))
  } catch {
    // ignore unwritable storage
  }
  applyTheme(t)
}

/** Theme state for the settings UI. Writing applies and persists immediately. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const update = (patch: Partial<Theme>) =>
    setTheme((t) => {
      const next = { ...t, ...patch }
      saveTheme(next)
      return next
    })
  return { theme, update }
}
