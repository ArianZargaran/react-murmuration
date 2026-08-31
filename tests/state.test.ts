import { test } from 'node:test'
import assert from 'node:assert/strict'

// Storage stub has to exist before the gallery module is imported.
const store = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
}

import { DEFAULTS, type Controls } from '../src/controls'
import { encodeControls, decodeControls, coerceControls } from '../src/urlState'
import { loadAll, save } from '../src/gallery'
import type { Vec3 } from '../src/Murmuration'

const path: Vec3[] = [[0, 0.5, 0], [0.35, 0.2, 1], [1, 0.5, 1]]

test('an untouched studio has a clean URL', () => {
  assert.equal(encodeControls(DEFAULTS), '')
})

test('a tuning survives the round trip through a URL', () => {
  const tuned: Controls = { ...DEFAULTS, speed: 520, path, boxDepth: 900, paletteIndex: 2 }
  const back = decodeControls(encodeControls(tuned))
  assert.equal(back.speed, 520)
  assert.equal(back.boxDepth, 900)
  assert.equal(back.paletteIndex, 2)
  assert.deepEqual(back.path, path)
})

test('only what changed is written', () => {
  const q = new URLSearchParams(encodeControls({ ...DEFAULTS, speed: 520 }))
  assert.deepEqual([...q.keys()], ['speed'])
})

test('the URL is never trusted', () => {
  const c = decodeControls('?speed=999999&count=-5&curve=notaparam&noiseScale=abc&palette=nope')
  assert.equal(c.speed, 800, 'clamped to the slider maximum')
  assert.equal(c.count, 2000, 'clamped to the slider minimum')
  assert.equal(c.noiseScale, DEFAULTS.noiseScale, 'unparseable value ignored')
  assert.equal(c.paletteIndex, DEFAULTS.paletteIndex, 'unknown palette falls back')
  assert.ok(!('curve' in c), 'unknown key dropped')
})

test('a malformed path falls back rather than corrupting the studio', () => {
  assert.deepEqual(coerceControls({ path: 'not-a-path' }).path, DEFAULTS.path)
  assert.deepEqual(coerceControls({ path: [[0, 0, 0]] }).path, DEFAULTS.path, 'needs two points')
  assert.deepEqual(coerceControls({ path: [['a', 'b', 'c'], [1, 1, 1]] }).path, DEFAULTS.path)
})

test('a saved tuning survives storage, including its path', () => {
  store.clear()
  save({ ...DEFAULTS, path, speed: 480 }, null)
  const entry = loadAll()[0]
  assert.equal(entry.controls.speed, 480)
  assert.deepEqual(entry.controls.path, path)
})

test('an entry saved before a parameter existed still opens', () => {
  store.clear()
  // `curve` was a real parameter until the 3D path replaced it.
  store.set(
    'murmuration.gallery.v1',
    JSON.stringify([{ id: 'old', name: 'Legacy', savedAt: 1, thumb: null, controls: { speed: 500, curve: 0.3 } }])
  )
  const [entry] = loadAll()
  assert.equal(entry.controls.speed, 500, 'kept the value that still exists')
  assert.ok(!('curve' in entry.controls), 'dropped the one that does not')
  assert.deepEqual(entry.controls.path, DEFAULTS.path, 'filled in what was missing')
})

test('unreadable storage yields an empty gallery rather than throwing', () => {
  store.clear()
  store.set('murmuration.gallery.v1', '{ not json')
  assert.deepEqual(loadAll(), [])
})
