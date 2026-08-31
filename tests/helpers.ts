// Minimal stand-ins for the browser bits the library touches. Everything the
// field needs is a canvas, a rAF, and a clock — so a test can drive it frame by
// frame at a rate of its choosing, which is how the fps assertions work.
export type Harness = {
  advance: (frames: number, fps?: number) => void
  canvas: HTMLCanvasElement
  strokes: () => number
}

export function installBrowserStubs(): { flush: () => void; setClock: (ms: number) => void } {
  const g = globalThis as Record<string, unknown>
  g.window = { devicePixelRatio: 1 }
  g.ResizeObserver = class { observe() {} disconnect() {} }
  g.performance = { now: () => clock }
  g.requestAnimationFrame = (cb: FrameRequestCallback) => { queued = cb; return 1 }
  g.cancelAnimationFrame = () => { queued = null }
  return { flush: () => { const cb = queued; queued = null; cb?.(clock) }, setClock: (ms) => { clock = ms } }
}

let queued: FrameRequestCallback | null = null
let clock = 0

export function makeHarness(width = 800, height = 450) {
  let strokeCount = 0
  const ctx = new Proxy(
    {},
    {
      get: (_t, k) => (k === 'stroke' ? () => { strokeCount++ } : () => {}),
      set: () => true,
    }
  )
  const canvas = {
    clientWidth: width,
    clientHeight: height,
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement
  return { canvas, strokes: () => strokeCount }
}
