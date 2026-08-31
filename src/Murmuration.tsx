// murmuration — particles advected along a noise flow field, as one file.
//
// NOT a murmuration. A real murmuration is emergent: every bird runs local
// rules — separation, alignment, cohesion — and nobody dictates the global
// shape. Here the trajectory is dictated and the particles obey. The name is
// only about how it looks. There are no neighbour lookups anywhere below.
//
//   <Murmuration />                          // the tuned defaults below
//   <Murmuration speed={480} trail={0.9} />  // override any of them
//
// The canvas fills its parent, so give the parent a size.
//
// The only import is React, and it is only used by the component at the very
// bottom — everything above it is framework-free and touches nothing but a
// canvas. No DOM is touched at module scope, so this is safe to import from a
// server-rendered app.

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

export type MurmurationParams = {
  // --- the flow -----------------------------------------------------------
  count: number           // particles
  speed: number           // px/sec at the fast edge of the band
  noiseScale: number      // field zoom, in noise cells per 1000px. Lower = broader.
  turbulence: number      // radians the noise may swing a particle off the centreline
  dispersal: number       // 0..1, how freely particles are allowed to leave the flow
  fieldDrift: number      // how fast the field reorganises, relative to the flow
  octaveGain: number      // weight of the finer octave. 0 is one smooth scale.
  lacunarity: number      // frequency step between octaves

  // --- the shape it is directed along --------------------------------------
  // The path is the dictated trajectory, in normalised box space: every point
  // is 0..1 on each axis, so changing the box does not destroy it. Two points
  // is a straight line; more are smoothed through with a spline.
  path: Vec3[]
  boxWidth: number        // the volume the flow is composed inside
  boxHeight: number
  boxDepth: number
  bandWidth: number       // radius of the tube around the path, fraction of height
  depthFade: number       // 0..1, how much distance dims and thins a particle

  // --- how fast each particle goes -----------------------------------------
  coreSpeed: number       // speed multiplier on the centreline
  edgeSpeed: number       // speed multiplier out at the band edge
  speedJitter: number     // 0..1, per-particle variation around that

  // --- lifetime ------------------------------------------------------------
  lifespan: number        // seconds a particle lives at most
  lifeJitter: number      // 0..1, spread below that, so respawns never pulse

  // --- how it is drawn ------------------------------------------------------
  size: number            // stroke width multiplier. 1 is the tuned default.
  stretch: number         // how hard width reacts to speed. 0 is uniform width.
  ink: number             // 0..1 per-stroke opacity, so density builds gradually
  trail: number           // 0..1, how much of the previous frame survives
  palette: Palette
}

export type Vec3 = [number, number, number]

export type Palette = {
  background: string
  stops: string[]     // sampled along the path, not per particle
}

// ===========================================================================
// 2D gradient noise.
//
// Built on an integer hash rather than a shuffled permutation table, so there
// is no setup data to carry around. The field samples this and turns the result
// into an ANGLE, never straight into a velocity — that is what keeps
// neighbouring particles travelling together rather than each shimmering on
// its own.
// ===========================================================================

const TAU = Math.PI * 2

// 16 unit vectors, one per possible hash result.
const GRAD_COUNT = 16
const GRAD_X = new Float32Array(GRAD_COUNT)
const GRAD_Y = new Float32Array(GRAD_COUNT)
for (let i = 0; i < GRAD_COUNT; i++) {
  const a = (i / GRAD_COUNT) * TAU
  GRAD_X[i] = Math.cos(a)
  GRAD_Y[i] = Math.sin(a)
}

// Integer hash -> gradient index. Math.imul keeps the multiplies in 32-bit.
function gradIndex(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iy, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h ^= h >>> 13
  return Math.imul(h, 0xc2b2ae35) >>> 28
}

// Returns roughly -1..1.
function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy

  // Quintic fade: zero first and second derivative at the cell edges, which is
  // what stops the flow field from creasing along the lattice.
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10)

  const g00 = gradIndex(ix, iy, seed)
  const g10 = gradIndex(ix + 1, iy, seed)
  const g01 = gradIndex(ix, iy + 1, seed)
  const g11 = gradIndex(ix + 1, iy + 1, seed)

  const n00 = GRAD_X[g00] * fx + GRAD_Y[g00] * fy
  const n10 = GRAD_X[g10] * (fx - 1) + GRAD_Y[g10] * fy
  const n01 = GRAD_X[g01] * fx + GRAD_Y[g01] * (fy - 1)
  const n11 = GRAD_X[g11] * (fx - 1) + GRAD_Y[g11] * (fy - 1)

  const top = n00 + u * (n10 - n00)
  const bottom = n01 + u * (n11 - n01)
  return (top + v * (bottom - top)) * 1.4
}

// ---------------------------------------------------------------------------
// Field constants. Tuned by eye and deliberately not exposed as controls: the
// sliders are the whole surface area, and every one added is also a line in the
// exported snippet.
// ---------------------------------------------------------------------------

// Each octave is sampled on a rotated copy of the plane.
//
// Gradient noise is exactly zero at every lattice point and its features line
// up with the sampling axes. Sample both octaves on the same un-rotated grid
// and those lattice lines sit perfectly vertical in screen space, reinforcing
// each other — which in a flow that runs horizontally reads as evenly spaced
// vertical gaps at the cell spacing. Rotating each octave by a different
// angle breaks the alignment with the screen and with the other octave.
const ROT_A = 0.5
const ROT_B = 2.35
const ROT_D = 5.6
const COS_A = Math.cos(ROT_A), SIN_A = Math.sin(ROT_A)
const COS_B = Math.cos(ROT_B), SIN_B = Math.sin(ROT_B)
const COS_D = Math.cos(ROT_D), SIN_D = Math.sin(ROT_D)
// How fast the field reorganises, as a fraction of the rate particles cross it.
// A RATIO, not a speed.
//
// This is the single most important number in the file, and it is a trade, not
// a setting with a right answer. Particles moving through a slowly-changing
// flow field ALWAYS collapse onto its attracting streamlines — that is what a
// flow field does — leaving alternating dense lanes and empty voids. The only
// thing that prevents it is the field reorganising about as fast as particles
// converge, which happens at roughly turbulence x speed x noiseScale.
//
// A change that invalidates what is already on the canvas gets a brief burst
// of accelerated fade. Without it a new palette is read through a second or
// more of the old one, which looks like a bug rather than a transition.
const FLUSH_TIME = 0.3      // seconds of accelerated fade after such a change
const FLUSH_DECAY = 16      // fade rate during that window (~50ms half-life)

const COLOR_STEPS = 32      // colour buckets along the arc
const DEPTH_STEPS = 4       // depth tiers: painter ordering, and distance fade
const COLOR_DITHER = 4      // buckets of spatial jitter when assigning colour
const WIDTHS = [0.3, 0.5, 0.75, 1.1, 1.7]   // stroke-width tiers
const WIDTH_STEPS = WIDTHS.length
const BUCKETS = DEPTH_STEPS * COLOR_STEPS * WIDTH_STEPS
const SKIP = 0xffff       // bucket id for a particle with no segment this frame

// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// One css colour per bucket, resolved up front. Sampling the palette per
// particle per frame would cost more than the simulation does.
function buildColors(stops: string[], ink: number, depthFade: number): string[] {
  const rgb = stops.map(hexToRgb)
  const out: string[] = []
  // One row of colours per depth tier, pre-dimmed. Distance fade costs nothing
  // at draw time because it is already baked into the stroke colour.
  for (let d = 0; d < DEPTH_STEPS; d++) {
  const near = d / (DEPTH_STEPS - 1)
  const alpha = +(ink * (1 - depthFade * (1 - near))).toFixed(4)
  for (let i = 0; i < COLOR_STEPS; i++) {
    const t = (i / (COLOR_STEPS - 1)) * (rgb.length - 1)
    const a = Math.min(Math.floor(t), rgb.length - 2)
    const f = t - a
    const c0 = rgb[a]
    const c1 = rgb[a + 1]
    out.push(
      `rgba(${Math.round(c0[0] + (c1[0] - c0[0]) * f)},` +
        `${Math.round(c0[1] + (c1[1] - c0[1]) * f)},` +
        `${Math.round(c0[2] + (c1[2] - c0[2]) * f)},${alpha})`
    )
  }
  }
  return out
}

// ---------------------------------------------------------------------------
// The path: a Catmull-Rom spline through the control points, resampled at even
// arc length and given a local frame at every sample.
//
// Even spacing matters because particles advance along this at a fixed speed —
// sampling by raw spline parameter would make them race through tight bends and
// crawl through straight runs. The frame matters because particles live in the
// cross-section perpendicular to the path, so they need a stable normal and
// binormal; those are carried forward from one sample to the next (parallel
// transport) rather than recomputed, which is what stops the tube twisting.
// ---------------------------------------------------------------------------

const PATH_SAMPLES = 256

type PathTable = {
  n: number
  px: Float32Array; py: Float32Array; pz: Float32Array   // position
  tx: Float32Array; ty: Float32Array; tz: Float32Array   // tangent
  nx: Float32Array; ny: Float32Array; nz: Float32Array   // normal
  bx: Float32Array; by: Float32Array; bz: Float32Array   // binormal
  length: number
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

function buildPath(points: Vec3[], w: number, h: number, d: number): PathTable {
  // Normalised control points scaled into the box, with the ends duplicated so
  // the spline reaches the first and last point instead of starting short.
  const pts = (points.length >= 2 ? points : [[0, 0.5, 0.5], [1, 0.5, 0.5]] as Vec3[]).map(
    (p) => [p[0] * w, p[1] * h, p[2] * d] as Vec3
  )
  const ctrl = [pts[0], ...pts, pts[pts.length - 1]]

  // Dense sample first, so arc length can be measured before resampling.
  const DENSE = 2048
  const dx = new Float64Array(DENSE)
  const dy = new Float64Array(DENSE)
  const dz = new Float64Array(DENSE)
  const arc = new Float64Array(DENSE)
  const segs = ctrl.length - 3

  for (let i = 0; i < DENSE; i++) {
    const u = (i / (DENSE - 1)) * segs
    const seg = Math.min(Math.floor(u), segs - 1)
    const t = u - seg
    const a = ctrl[seg], b = ctrl[seg + 1], c = ctrl[seg + 2], e = ctrl[seg + 3]
    dx[i] = catmullRom(a[0], b[0], c[0], e[0], t)
    dy[i] = catmullRom(a[1], b[1], c[1], e[1], t)
    dz[i] = catmullRom(a[2], b[2], c[2], e[2], t)
    arc[i] = i === 0 ? 0 : arc[i - 1] + Math.hypot(dx[i] - dx[i - 1], dy[i] - dy[i - 1], dz[i] - dz[i - 1])
  }

  const total = arc[DENSE - 1] || 1
  const n = PATH_SAMPLES
  const out: PathTable = {
    n,
    px: new Float32Array(n), py: new Float32Array(n), pz: new Float32Array(n),
    tx: new Float32Array(n), ty: new Float32Array(n), tz: new Float32Array(n),
    nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n),
    bx: new Float32Array(n), by: new Float32Array(n), bz: new Float32Array(n),
    length: total,
  }

  // Resample evenly by arc length.
  let cursor = 0
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * total
    while (cursor < DENSE - 2 && arc[cursor + 1] < target) cursor++
    const span = arc[cursor + 1] - arc[cursor] || 1
    const f = Math.min(Math.max((target - arc[cursor]) / span, 0), 1)
    out.px[i] = dx[cursor] + (dx[cursor + 1] - dx[cursor]) * f
    out.py[i] = dy[cursor] + (dy[cursor + 1] - dy[cursor]) * f
    out.pz[i] = dz[cursor] + (dz[cursor + 1] - dz[cursor]) * f
  }

  // Tangents by central difference.
  for (let i = 0; i < n; i++) {
    const a = Math.max(i - 1, 0)
    const b = Math.min(i + 1, n - 1)
    let x = out.px[b] - out.px[a]
    let y = out.py[b] - out.py[a]
    let z = out.pz[b] - out.pz[a]
    const len = Math.hypot(x, y, z) || 1
    out.tx[i] = x / len; out.ty[i] = y / len; out.tz[i] = z / len
  }

  // Parallel transport: pick any normal at the start, then carry it along,
  // re-orthogonalising against each new tangent instead of rebuilding it.
  let nX = 0, nY = 0, nZ = 1
  if (Math.abs(out.tz[0]) > 0.9) { nX = 0; nY = 1; nZ = 0 }
  for (let i = 0; i < n; i++) {
    const tX = out.tx[i], tY = out.ty[i], tZ = out.tz[i]
    const dot = nX * tX + nY * tY + nZ * tZ
    nX -= tX * dot; nY -= tY * dot; nZ -= tZ * dot
    const len = Math.hypot(nX, nY, nZ) || 1
    nX /= len; nY /= len; nZ /= len
    out.nx[i] = nX; out.ny[i] = nY; out.nz[i] = nZ
    out.bx[i] = tY * nZ - tZ * nY
    out.by[i] = tZ * nX - tX * nZ
    out.bz[i] = tX * nY - tY * nX
  }

  return out
}

// The same spline the field follows, in normalised space, for anything that
// needs to draw the path rather than fly through it. Exported so an editor does
// not end up with a second implementation of the curve.
export function samplePath(points: Vec3[], samples = 96): Vec3[] {
  const pts = points.length >= 2 ? points : ([[0, 0.5, 0.5], [1, 0.5, 0.5]] as Vec3[])
  const ctrl = [pts[0], ...pts, pts[pts.length - 1]]
  const segs = ctrl.length - 3
  const out: Vec3[] = []
  for (let i = 0; i < samples; i++) {
    const u = (i / (samples - 1)) * segs
    const seg = Math.min(Math.floor(u), segs - 1)
    const t = u - seg
    const a = ctrl[seg], b = ctrl[seg + 1], c = ctrl[seg + 2], e = ctrl[seg + 3]
    out.push([
      catmullRom(a[0], b[0], c[0], e[0], t),
      catmullRom(a[1], b[1], c[1], e[1], t),
      catmullRom(a[2], b[2], c[2], e[2], t),
    ])
  }
  return out
}

function samePath(a: Vec3[], b: Vec3[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1] || a[i][2] !== b[i][2]) return false
  }
  return true
}

// Compared by value, not identity. Callers routinely pass an inline object
// literal — our own README and the copy-code snippet both do — which is a new
// reference on every render. Comparing by identity would rebuild the colour
// table and retrigger the accelerated fade every frame, quietly turning a long
// trail into a short one.
function samePalette(a: Palette, b: Palette): boolean {
  if (a === b) return true
  if (a.background !== b.background || a.stops.length !== b.stops.length) return false
  for (let i = 0; i < a.stops.length; i++) if (a.stops[i] !== b.stops[i]) return false
  return true
}

export type MurmurationHandle = {
  setParams(next: Partial<MurmurationParams>): void
  destroy(): void
}

export function createField(
  canvas: HTMLCanvasElement,
  initial: MurmurationParams,
  onFps?: (fps: number) => void
): MurmurationHandle {
  const ctx = canvas.getContext('2d', { alpha: false })!
  let params = { ...initial }
  let colors = buildColors(params.palette.stops, params.ink, params.depthFade)
  let path = buildPath(params.path, params.boxWidth, params.boxHeight, params.boxDepth)

  let w = 0
  let h = 0

  // Particle state, struct-of-arrays. A particle is progress along the path
  // plus a position in the cross-section perpendicular to it, which is what
  // makes "the trajectory is dictated" literal rather than a shape the noise
  // happens to produce.
  let capacity = 0
  let u = new Float32Array(0)      // 0..1 along the path
  let oa = new Float32Array(0)     // offset along the local normal
  let ob = new Float32Array(0)     // offset along the local binormal
  let sx = new Float32Array(0)     // screen position this frame
  let sy = new Float32Array(0)
  let qx = new Float32Array(0)     // and last frame, which is the segment drawn
  let qy = new Float32Array(0)
  let age = new Float32Array(0)
  let life = new Float32Array(0)
  let drift = new Float32Array(0)  // latent stray, -1..1, fixed for a particle's life
  let rate = new Float32Array(0)   // per-particle speed multiplier

  // Draw batching.
  let bucket = new Uint16Array(0)
  let order = new Uint32Array(0)
  const cursor = new Int32Array(BUCKETS)
  const counts = new Int32Array(BUCKETS)

  const bell = () => Math.random() + Math.random() - 1

  function respawn(i: number, seed: boolean) {
    // Particles re-enter anywhere along the path, not at one end: a single
    // source reads as a seam and starves the far end of anything to draw.
    u[i] = Math.random()
    const radius = params.bandWidth * params.boxHeight
    const theta = Math.random() * Math.PI * 2
    const r = Math.abs(bell()) * radius
    oa[i] = Math.cos(theta) * r
    ob[i] = Math.sin(theta) * r
    life[i] = params.lifespan * (1 - params.lifeJitter * Math.random())
    age[i] = seed ? Math.random() * life[i] : 0
    drift[i] = Math.random() * 2 - 1
    rate[i] = 1 + (Math.random() * 2 - 1) * params.speedJitter
    sx[i] = NaN                     // no segment on the frame it reappears
  }

  function allocate(requested: number) {
    // Grow in blocks. Dragging the particle slider walks through hundreds of
    // intermediate values, and reallocating at every one would stall the frame.
    const n = Math.ceil(requested / 16384) * 16384
    if (n <= capacity) return

    const from = capacity
    const grow = (arr: Float32Array) => {
      const a = new Float32Array(n)
      a.set(arr)
      return a
    }
    u = grow(u); oa = grow(oa); ob = grow(ob)
    sx = grow(sx); sy = grow(sy); qx = grow(qx); qy = grow(qy)
    age = grow(age); life = grow(life)
    drift = grow(drift); rate = grow(rate)
    bucket = new Uint16Array(n)
    order = new Uint32Array(n)
    capacity = n

    for (let i = from; i < n; i++) respawn(i, true)
  }

  function resize() {
    const nextW = canvas.clientWidth
    const nextH = canvas.clientHeight
    if (nextW === w && nextH === h) return
    if (nextW === 0 || nextH === 0) return
    w = nextW
    h = nextH

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    // Resizing the backing store resets the context, so transform and cap are
    // set again here rather than once at startup.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.fillStyle = params.palette.background
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < capacity; i++) sx[i] = NaN
  }

  let t = 0
  let flush = 0
  let last = 0
  let fps = 60
  let fpsClock = 0
  let raf = 0

  // Advance and draw one slice of time. Split out from the frame callback so
  // the simulation is driven purely by dt and never by frame counts.
  function step(dt: number) {
    const ns = params.noiseScale / 1000

    // A particle crosses one noise cell in 1 / (ns * speed) seconds, so
    // advancing the field in proportion to ns * speed holds that ratio
    // constant at any speed and any field zoom.
    t += dt * params.fieldDrift * params.speed * ns

    // Trail: paint the background back over the previous frame at partial
    // opacity. Derived from elapsed time rather than applied per frame, so a
    // 120Hz display does not get half the trail length of a 60Hz one.
    let decay = 0.35 * Math.pow(400, 1 - params.trail)
    if (flush > 0) {
      flush -= dt
      decay = Math.max(decay, FLUSH_DECAY)
    }
    ctx.globalAlpha = Math.min(1 - Math.exp(-decay * dt), 1)
    ctx.fillStyle = params.palette.background
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1

    const n = params.count
    const radius = params.bandWidth * params.boxHeight
    const invRadius = 1 / (radius || 1)
    const turn = Math.PI * params.turbulence
    const baseSpeed = params.speed
    const spread = params.edgeSpeed - params.coreSpeed
    // Math.pow is measurably slower than sqrt, and 0.5 is the tuned default.
    const sqrtStretch = params.stretch === 0.5
    const depth = params.boxDepth || 1

    // The box is fitted into the canvas and centred, so a composition is the
    // same picture whatever size the window happens to be.
    const scale = Math.min(w / params.boxWidth, h / params.boxHeight)
    const originX = (w - params.boxWidth * scale) / 2
    const originY = (h - params.boxHeight * scale) / 2

    const lastIndex = path.n - 1
    counts.fill(0)

    for (let i = 0; i < n; i++) {
      // --- where on the path, and the frame there --------------------------
      const f = u[i] * lastIndex
      const i0 = f | 0
      const i1 = i0 < lastIndex ? i0 + 1 : lastIndex
      const g = f - i0

      const pxw = path.px[i0] + (path.px[i1] - path.px[i0]) * g
      const pyw = path.py[i0] + (path.py[i1] - path.py[i0]) * g
      const pzw = path.pz[i0] + (path.pz[i1] - path.pz[i0]) * g
      const nX = path.nx[i0], nY = path.ny[i0], nZ = path.nz[i0]
      const bX = path.bx[i0], bY = path.by[i0], bZ = path.bz[i0]

      const a = oa[i]
      const b = ob[i]
      const wx = pxw + nX * a + bX * b
      const wy = pyw + nY * a + bY * b
      const wz = pzw + nZ * a + bZ * b

      // --- the field decides which way it strays ---------------------------
      // Two octaves sampled in world space and turned into an ANGLE in the
      // cross-section, never straight into a velocity: that is what keeps
      // neighbours straying together instead of each shimmering on its own.
      const n1 = (noise2((wx * COS_A - wy * SIN_A) * ns + t, (wx * SIN_A + wy * COS_A) * ns + wz * ns, 0) +
                  noise2((wx * COS_D - wy * SIN_D) * ns - t, (wx * SIN_D + wy * COS_D) * ns - wz * ns, 7)) * 0.707
      const bs = ns * params.lacunarity
      const n2 = noise2((wx * COS_B - wy * SIN_B) * bs - t * 1.9, (wx * SIN_B + wy * COS_B) * bs + wz * bs + t * 0.7, 101)
      const wobble = (n1 + n2 * params.octaveGain) / (1 + params.octaveGain)

      const theta = wobble * turn

      // Leakers. A minority peel progressively out of the tube; without them
      // the whole thing reads as one solid ribbon. Cubing the latent value is
      // what makes it a minority — it crushes the middle of the distribution
      // toward zero and leaves only the tails with any real stray.
      const lifeT = age[i] / life[i]
      const d = drift[i]
      const stray = d * d * d * params.dispersal * lifeT * lifeT

      // --- how fast, and where it lands ------------------------------------
      // Slow and dense down the middle, fast out at the rim. That gradient is
      // what gives round cores and elongated edges from one set of rules.
      const edge = Math.min(Math.sqrt(a * a + b * b) * invRadius, 1.4)
      const speed = baseSpeed * rate[i] * (params.coreSpeed + edge * spread)

      u[i] += (speed * dt) / path.length
      const lateral = speed * dt * (Math.abs(theta) + Math.abs(stray) * 4)
      oa[i] = a + Math.cos(theta) * lateral + nX * 0
      ob[i] = b + Math.sin(theta) * lateral + stray * radius * dt

      age[i] += dt

      // --- project ----------------------------------------------------------
      const px2 = originX + wx * scale
      const py2 = originY + wy * scale
      const near = Math.min(Math.max(1 - wz / depth, 0), 1)

      const gone =
        age[i] >= life[i] ||
        u[i] >= 1 ||
        u[i] < 0 ||
        wz < -depth * 0.5 ||
        wz > depth * 1.5 ||
        Math.abs(a) > radius * 4 ||
        Math.abs(b) > radius * 4
      if (gone) {
        respawn(i, false)
        bucket[i] = SKIP
        continue
      }

      qx[i] = sx[i]
      qy[i] = sy[i]
      sx[i] = px2
      sy[i] = py2
      if (!(qx[i] === qx[i])) {          // NaN on the frame after a respawn
        bucket[i] = SKIP
        continue
      }

      // --- colour -----------------------------------------------------------
      // Sampled from position along the path, so neighbours in the flow share
      // one. It is the path that is coloured, not the particle.
      //
      // The jitter is deliberately several buckets wide. Each bucket is stroked
      // as ONE path, and a path composites its own overlaps only once, so a
      // dense bucket saturates. If bucket membership tracked position exactly,
      // particles near a boundary would split across two less-saturated buckets
      // and composite brighter than the ones mid-bucket, drawing regular stripes
      // at the bucket spacing. Spreading each position across several buckets
      // removes the periodicity.
      let ci = (u[i] * COLOR_STEPS + (Math.random() - 0.5) * COLOR_DITHER) | 0
      if (ci < 0) ci = 0
      else if (ci >= COLOR_STEPS) ci = COLOR_STEPS - 1

      let di = (near * DEPTH_STEPS) | 0
      if (di < 0) di = 0
      else if (di >= DEPTH_STEPS) di = DEPTH_STEPS - 1

      // --- width ------------------------------------------------------------
      // Ink per particle stays roughly constant: faster means a longer, thinner
      // streak, slower means a short fat dot. Fading in and out is done with
      // width rather than alpha so it costs no extra draw calls, and distance
      // thins as well as dims. Dithered before quantising for the same reason
      // the colour is.
      const fade = Math.min(lifeT * 9, (1 - lifeT) * 3.2, 1)
      const shrink = 1 - params.depthFade * (1 - near)
      const norm = Math.max(speed / baseSpeed, 0.25)
      const falloff = sqrtStretch ? Math.sqrt(norm) : Math.pow(norm, params.stretch)
      const rel = ((1.45 * fade * shrink) / falloff) * (0.75 + Math.random() * 0.5)
      const wi = rel < 0.4 ? 0 : rel < 0.62 ? 1 : rel < 0.92 ? 2 : rel < 1.4 ? 3 : 4

      // Depth is the outermost term, so walking the buckets in order draws far
      // before near — a painter's sort for free, on machinery already here.
      const bk = (di * COLOR_STEPS + ci) * WIDTH_STEPS + wi
      bucket[i] = bk
      counts[bk]++
    }

    // Counting sort into bucket order. One stroke() per bucket instead of one
    // per particle is the entire reason tens of thousands of these hold 60fps
    // on a 2D canvas. Histogram, prefix sum, scatter.
    let acc = 0
    for (let b = 0; b < BUCKETS; b++) {
      cursor[b] = acc
      acc += counts[b]
    }
    for (let i = 0; i < n; i++) {
      const b = bucket[i]
      if (b !== SKIP) order[cursor[b]++] = i
    }

    for (let b = 0; b < BUCKETS; b++) {
      const size = counts[b]
      if (size === 0) continue
      const end = cursor[b]
      ctx.strokeStyle = colors[(b / WIDTH_STEPS) | 0]
      ctx.lineWidth = WIDTHS[b % WIDTH_STEPS] * params.size
      ctx.beginPath()
      for (let k = end - size; k < end; k++) {
        const i = order[k]
        ctx.moveTo(qx[i], qy[i])
        ctx.lineTo(sx[i], sy[i])
      }
      ctx.stroke()
    }
  }

  function frame() {
    raf = requestAnimationFrame(frame)
    // Self-heal: if the element had no size when the observer first fired, retry
    // here rather than waiting for a resize that may never come.
    if (w === 0 || h === 0) {
      resize()
      if (w === 0 || h === 0) return
    }

    const now = performance.now()
    if (!last) last = now
    const elapsed = (now - last) / 1000
    last = now
    if (elapsed <= 0) return

    // Clamped so a backgrounded tab does not teleport every particle on return.
    const dt = Math.min(elapsed, 1 / 30)

    // The readout uses the TRUE elapsed time, not the clamped step. Measuring
    // it from dt caps the reported rate at 30 and so reports a healthy 30fps
    // while the page is actually running at 10 — a meter that lies precisely
    // when it matters.
    fps += (1 / elapsed - fps) * Math.min(elapsed * 3, 1)
    fpsClock += elapsed
    if (fpsClock > 0.25 && onFps) {
      fpsClock = 0
      onFps(fps)
    }

    step(dt)
  }

  // Observing the canvas rather than the window: at mount the element has not
  // necessarily been laid out yet, and a window listener never corrects that.
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  resize()
  allocate(params.count)
  raf = requestAnimationFrame(frame)

  return {
    setParams(next: Partial<MurmurationParams>) {
      const before = params
      params = { ...params, ...next }

      if (
        !samePath(params.path, before.path) ||
        params.boxWidth !== before.boxWidth ||
        params.boxHeight !== before.boxHeight ||
        params.boxDepth !== before.boxDepth
      ) {
        path = buildPath(params.path, params.boxWidth, params.boxHeight, params.boxDepth)
        flush = FLUSH_TIME
      }

      if (
        !samePalette(params.palette, before.palette) ||
        params.ink !== before.ink ||
        params.depthFade !== before.depthFade
      ) {
        colors = buildColors(params.palette.stops, params.ink, params.depthFade)
        flush = FLUSH_TIME
      }

      // Anything that moves the geometry leaves stale imagery behind.
      if (
        params.noiseScale !== before.noiseScale ||
        params.turbulence !== before.turbulence ||
        params.bandWidth !== before.bandWidth ||
        params.count < before.count
      ) {
        flush = FLUSH_TIME
      }

      if (params.count > capacity) allocate(params.count)
    },
    destroy() {
      cancelAnimationFrame(raf)
      observer.disconnect()
    },
  }
}

// ===========================================================================
// React starts here. Everything above is independent of it.
// ===========================================================================

export type MurmurationProps = Partial<MurmurationParams> & {
  className?: string
  style?: CSSProperties
  /** Smoothed frames per second. Mostly here for tooling. */
  onFps?: (fps: number) => void
}

export const MURMURATION_DEFAULTS: MurmurationParams = {
  count: 32000,
  speed: 300,
  noiseScale: 3.5,
  turbulence: 1.15,
  dispersal: 0.35,
  fieldDrift: 6,
  octaveGain: 0.45,
  lacunarity: 2.7,

  // Samples of the sine these replaced, so the default composition is still the
  // one every other default was tuned against.
  path: [
    [0, 0.427, 0.5],
    [0.2, 0.479, 0.5],
    [0.4, 0.536, 0.5],
    [0.6, 0.586, 0.5],
    [0.8, 0.619, 0.5],
    [1, 0.63, 0.5],
  ],
  boxWidth: 1600,
  boxHeight: 900,
  boxDepth: 700,
  bandWidth: 0.23,
  depthFade: 0.55,

  coreSpeed: 0.3,
  edgeSpeed: 1.55,
  speedJitter: 0.25,

  lifespan: 4.6,
  lifeJitter: 0.76,   // gives the 1.1s..4.6s spread these were tuned at

  size: 1,
  stretch: 0.5,       // 0.5 is the square root the widths were tuned against
  ink: 0.32,
  trail: 0.6,
  palette: {
    background: '#07060a',
    stops: ['#16255f', '#5c1cb4', '#c81f63', '#e8642f', '#e8a25a'],
  },
}

export function Murmuration({ className, style, onFps, ...overrides }: MurmurationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<MurmurationHandle | null>(null)

  // onFps may be a fresh closure every render; the field is created once, so it
  // reads through a ref rather than being torn down when the callback changes.
  const fpsRef = useRef(onFps)
  fpsRef.current = onFps

  const params: MurmurationParams = { ...MURMURATION_DEFAULTS, ...strip(overrides) }
  const initial = useRef(params)

  // Created once and then steered. Rebuilding on every prop change would reseed
  // the particles and throw away the trail.
  useEffect(() => {
    const field = createField(canvasRef.current!, initial.current, (fps) => fpsRef.current?.(fps))
    fieldRef.current = field
    return () => {
      field.destroy()
      fieldRef.current = null
    }
  }, [])

  useEffect(() => {
    fieldRef.current?.setParams(params)
  })

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  )
}

// An explicitly passed `undefined` should fall back to the default rather than
// overwrite it, which a bare spread would do.
function strip(o: Partial<MurmurationParams>): Partial<MurmurationParams> {
  const out: Partial<MurmurationParams> = {}
  for (const k in o) {
    const v = (o as Record<string, unknown>)[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}
