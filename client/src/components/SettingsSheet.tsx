import clsx from 'clsx'
import type { AccentKey, EditorFont, ThemeMode } from '../lib/theme'
import { useTheme } from '../lib/theme'
import { IconClose } from './icons'

const MODES: { key: ThemeMode; label: string }[] = [
  { key: 'oled', label: 'OLED' },
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
]

const ACCENTS: { key: AccentKey; swatch: string }[] = [
  { key: 'mono', swatch: 'currentColor' },
  { key: 'blue', swatch: '#3b82f6' },
  { key: 'green', swatch: '#22c55e' },
  { key: 'orange', swatch: '#f97316' },
  { key: 'purple', swatch: '#a855f7' },
  { key: 'red', swatch: '#ef4444' },
]

const FONTS: { key: EditorFont; label: string; sample: string }[] = [
  { key: 'mono', label: 'Mono', sample: 'JetBrains Mono' },
  { key: 'sans', label: 'Sans', sample: 'Inter' },
  { key: 'serif', label: 'Serif', sample: 'Iowan' },
]

export default function SettingsSheet({ theme, update, onClose }: { theme: ReturnType<typeof useTheme>['theme']; update: ReturnType<typeof useTheme>['update']; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="rise relative w-full max-w-sm rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Settings</h2>
          <button onClick={onClose} className="press grid h-7 w-7 place-items-center rounded-md text-[15px] text-[var(--color-dim)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-ink)]">
            <IconClose />
          </button>
        </div>

        <Field label="Theme">
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => update({ mode: m.key })}
                className={clsx(
                  'press rounded-lg border px-2 py-2 text-[13px]',
                  theme.mode === m.key ? 'border-[var(--color-accent)] bg-[var(--color-surface2)] text-[var(--color-ink)]' : 'border-[var(--color-line)] text-[var(--color-dim)] hover:bg-[var(--color-surface2)]',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Accent">
          <div className="flex gap-2.5">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                onClick={() => update({ accent: a.key })}
                title={a.key}
                className={clsx(
                  'press grid h-7 w-7 place-items-center rounded-full border',
                  theme.accent === a.key ? 'border-[var(--color-ink)]' : 'border-transparent',
                )}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: a.swatch, boxShadow: a.key === 'mono' ? 'inset 0 0 0 1px var(--color-line-strong)' : undefined }} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Editor font">
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => (
              <button
                key={f.key}
                onClick={() => update({ editorFont: f.key })}
                className={clsx(
                  'press rounded-lg border px-2 py-2 text-center',
                  theme.editorFont === f.key ? 'border-[var(--color-accent)] bg-[var(--color-surface2)]' : 'border-[var(--color-line)] hover:bg-[var(--color-surface2)]',
                )}
              >
                <div className="text-[13px] text-[var(--color-ink)]">{f.label}</div>
                <div className="mt-0.5 truncate text-[10px] text-[var(--color-faint)]">{f.sample}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Editor size — ${theme.editorSize}px`}>
          <input
            type="range"
            min={12}
            max={20}
            step={1}
            value={theme.editorSize}
            onChange={(e) => update({ editorSize: Number(e.target.value) })}
            className="w-full accent-[var(--color-accent)]"
          />
        </Field>

        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-faint)]">
          Your notes stay on this machine. These preferences are saved in the browser.
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 eyebrow">{label}</div>
      {children}
    </div>
  )
}
