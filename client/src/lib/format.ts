// Apple Notes shows a time for today, "Yesterday", a weekday within the last week, then a date.
// Everything here works off the local clock.

const DAY = 86_400_000

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function listDate(ms: number): string {
  const now = Date.now()
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY)
  const d = new Date(ms)
  if (days <= 0) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  const sameYear = d.getFullYear() === new Date(now).getFullYear()
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: sameYear ? undefined : '2-digit' })
}

// Full timestamp for the editor header, e.g. "September 8, 2026 at 9:41 PM".
export function editedAt(ms: number): string {
  const d = new Date(ms)
  const date = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} at ${time}`
}
