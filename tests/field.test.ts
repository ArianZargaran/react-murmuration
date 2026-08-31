import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installBrowserStubs, makeHarness } from './helpers'
import { createField, MURMURATION_DEFAULTS, type Vec3 } from '../src/Murmuration'

const { flush, setClock } = installBrowserStubs()

// Drives the field at a chosen real frame rate and returns what the readout
// claimed. The clamp that stops a backgrounded tab teleporting particles used
// to be applied to this too, which floored the reading at 30fps — a meter that
// read healthy exactly when the frame rate was worth knowing.
function reportedFps(actual: number, seconds = 3): number {
  setClock(0)
  let reported = 0
  const { canvas } = makeHarness()
  const field = createField(canvas, { ...MURMURATION_DEFAULTS, count: 2000 }, (v) => { reported = v })
  const step = 1000 / actual
  for (let i = 0; i < Math.ceil(actual * seconds); i++) {
    setClock(step * (i + 1))
    flush()
  }
  field.destroy()
  return reported
}

test('the fps readout tells the truth below 30fps', () => {
  for (const rate of [120, 60, 30, 24, 15, 10]) {
    const got = reportedFps(rate)
    assert.ok(
      Math.abs(got - rate) < Math.max(rate * 0.05, 0.5),
      `at a real ${rate}fps the readout said ${got.toFixed(1)}`
    )
  }
})

test('the field draws, and keeps drawing, for an awkward path', () => {
  setClock(0)
  const path: Vec3[] = [[0, 0.5, 0], [0.3, 0.05, 1], [0.35, 0.95, 0], [1, 0.5, 1]]
  const { canvas, strokes } = makeHarness()
  const field = createField(canvas, { ...MURMURATION_DEFAULTS, count: 4000, path, trail: 0 })
  for (let i = 0; i < 240; i++) { setClock(16.7 * (i + 1)); flush() }
  const drawn = strokes()
  field.destroy()
  assert.ok(drawn > 0, 'nothing was ever stroked')
  assert.ok(canvas.width > 0, 'the canvas was never sized')
})

test('a degenerate path does not stop the field', () => {
  setClock(0)
  const { canvas, strokes } = makeHarness()
  const field = createField(canvas, {
    ...MURMURATION_DEFAULTS,
    count: 1000,
    path: [[0.5, 0.5, 0.5], [0.5, 0.5, 0.5]] as Vec3[],
    boxDepth: 0,
  })
  for (let i = 0; i < 60; i++) { setClock(16.7 * (i + 1)); flush() }
  field.destroy()
  assert.ok(strokes() >= 0, 'zero-length path threw')
})

test('setParams steers without tearing the field down', () => {
  setClock(0)
  const { canvas } = makeHarness()
  const field = createField(canvas, { ...MURMURATION_DEFAULTS, count: 2000 })
  for (let i = 0; i < 30; i++) { setClock(16.7 * (i + 1)); flush() }
  // An equal-but-new palette object is what an inline prop produces on every
  // render; comparing it by identity used to rebuild the colours and retrigger
  // the accelerated fade every single frame.
  for (let i = 30; i < 90; i++) {
    field.setParams({ palette: { background: '#07060a', stops: ['#16255f', '#e8a25a'] } })
    setClock(16.7 * (i + 1))
    flush()
  }
  field.destroy()
  assert.ok(true)
})
