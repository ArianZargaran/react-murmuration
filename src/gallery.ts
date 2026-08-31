import { coerceControls } from './urlState'
import { PALETTES } from './palettes'
import type { Controls } from './controls'

// Saved tunings, in localStorage. Deliberately small: an id, a name you can
// edit, a thumbnail of what it looked like, and the controls.
//
// Entries are read through coerceControls, so a tuning saved today still opens
// after a parameter is renamed or removed. That is the whole reason this stores
// values rather than anything cleverer.

const KEY = 'murmuration.gallery.v1'

export type Saved = {
  id: string
  name: string
  savedAt: number
  thumb: string | null
  controls: Controls
}

export type SaveResult = { ok: true; entry: Saved } | { ok: false; reason: string }

// Every call is guarded: localStorage throws in private mode, when disabled,
// and when full, and none of those should take the studio down with them.
function read(): unknown {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function loadAll(): Saved[] {
  const raw = read()
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => ({
      id: String(e.id ?? crypto.randomUUID()),
      name: typeof e.name === 'string' ? e.name : 'Untitled',
      savedAt: Number(e.savedAt) || 0,
      thumb: typeof e.thumb === 'string' ? e.thumb : null,
      controls: coerceControls((e.controls ?? {}) as Record<string, unknown>),
    }))
    .sort((a, b) => b.savedAt - a.savedAt)
}

// Returns an error message, or null on success.
function write(entries: Saved[]): string | null {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
    return null
  } catch (err) {
    const quota = err instanceof DOMException && err.name === 'QuotaExceededError'
    return quota
      ? 'Storage is full. Delete a few saved tunings and try again.'
      : 'This browser will not let the page store anything.'
  }
}

export function suggestName(c: Controls): string {
  return `${PALETTES[c.paletteIndex].name} · ${Math.round(c.count / 1000)}k`
}

export function save(controls: Controls, thumb: string | null): SaveResult {
  const entry: Saved = {
    id: crypto.randomUUID(),
    name: suggestName(controls),
    savedAt: Date.now(),
    thumb,
    controls,
  }
  const err = write([entry, ...loadAll()])
  return err ? { ok: false, reason: err } : { ok: true, entry }
}

export function rename(id: string, name: string): void {
  write(loadAll().map((e) => (e.id === id ? { ...e, name } : e)))
}

export function remove(id: string): void {
  write(loadAll().filter((e) => e.id !== id))
}

// A jpeg of what was actually on screen, downscaled. Storing the real frame
// beats re-simulating a preview, and keeps entries at roughly 15kB.
export function captureThumb(source: HTMLCanvasElement | null, width = 360): string | null {
  if (!source || !source.width) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round((source.height / source.width) * width)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return null
  }
}
