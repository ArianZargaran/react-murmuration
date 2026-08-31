import { DEFAULTS, type Controls } from './controls'
import { GROUPS, type Key } from './params'
import type { Vec3 } from './Murmuration'
import { PALETTES } from './palettes'

// A tuning is a link. Only values that differ from the defaults are written, so
// an untouched studio has a clean URL and a tuned one carries exactly what you
// changed — the same rule the copy-code snippet follows.
//
// Nothing here trusts the URL: unknown keys are ignored, unparseable values are
// ignored, and numbers are clamped to the range the slider allows. That also
// means a link keeps working after a parameter is renamed or removed; the part
// that no longer exists is simply dropped.

const SPECS = new Map<Key, { min: number; max: number }>(
  GROUPS.flatMap((g) => g.items).map((s) => [s.key, { min: s.min, max: s.max }])
)

const EPSILON = 1e-9

// A path is a list of points, so it gets its own compact encoding rather than
// one query parameter per number: x,y,z per point, points separated by ';'.
const encodePath = (p: Vec3[]) =>
  p.map((pt) => pt.map((v) => +v.toFixed(3)).join(',')).join(';')

function decodePath(raw: string): Vec3[] | null {
  const pts = raw.split(';').map((seg) => seg.split(',').map(Number))
  if (pts.length < 2) return null
  if (!pts.every((p) => p.length === 3 && p.every((v) => Number.isFinite(v)))) return null
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
  return pts.map((p) => [clamp(p[0]), clamp(p[1]), clamp(p[2])] as Vec3)
}

const samePathValue = (a: Vec3[], b: Vec3[]) =>
  a.length === b.length && a.every((p, i) => p.every((v, j) => v === b[i][j]))

export function encodeControls(c: Controls): string {
  const q = new URLSearchParams()
  for (const key of SPECS.keys()) {
    if (Math.abs(c[key] - DEFAULTS[key]) > EPSILON) q.set(key, String(c[key]))
  }
  if (!samePathValue(c.path, DEFAULTS.path)) q.set('path', encodePath(c.path))
  if (c.paletteIndex !== DEFAULTS.paletteIndex) {
    q.set('palette', PALETTES[c.paletteIndex].name.toLowerCase())
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

// Builds valid Controls from anything: a URL, a stored entry, junk. Unknown
// keys are dropped, unparseable values ignored, numbers clamped to the range
// the slider allows. This is what lets a saved tuning or an old link survive a
// parameter being renamed or removed — the part that no longer exists is
// simply not there any more.
export function coerceControls(raw: Record<string, unknown>): Controls {
  const out: Controls = { ...DEFAULTS }

  for (const [key, range] of SPECS) {
    const n = Number(raw[key])
    if (!Number.isFinite(n)) continue
    out[key] = Math.min(Math.max(n, range.min), range.max)
  }

  const i = Number(raw.paletteIndex)
  if (Number.isInteger(i) && i >= 0 && i < PALETTES.length) out.paletteIndex = i

  // A path arrives either as the encoded string (from a URL) or as an array of
  // points (from a stored entry). Anything malformed falls back to the default.
  const p = raw.path
  if (typeof p === 'string') {
    const parsed = decodePath(p)
    if (parsed) out.path = parsed
  } else if (Array.isArray(p)) {
    const parsed = decodePath(
      p.map((pt) => (Array.isArray(pt) ? pt.slice(0, 3).join(',') : '')).join(';')
    )
    if (parsed) out.path = parsed
  }

  return out
}

export function decodeControls(search: string): Controls {
  const q = new URLSearchParams(search)
  const raw: Record<string, unknown> = Object.fromEntries(q)

  const name = q.get('palette')
  if (name) {
    const i = PALETTES.findIndex((p) => p.name.toLowerCase() === name.toLowerCase())
    if (i >= 0) raw.paletteIndex = i
  }

  return coerceControls(raw)
}
