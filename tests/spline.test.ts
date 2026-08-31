import { test } from 'node:test'
import assert from 'node:assert/strict'
import { samplePath, type Vec3 } from '../src/Murmuration'

const finite = (pts: Vec3[]) => pts.every((p) => p.every(Number.isFinite))

test('path passes through its first and last control point', () => {
  const path: Vec3[] = [[0, 0.2, 0.1], [0.5, 0.9, 0.4], [1, 0.3, 0.8]]
  const s = samplePath(path, 64)
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(s[0][i] - path[0][i]) < 1e-6, 'starts at the first point')
    assert.ok(Math.abs(s[s.length - 1][i] - path[2][i]) < 1e-6, 'ends at the last point')
  }
})

test('two control points give a straight line', () => {
  const s = samplePath([[0, 0, 0], [1, 1, 1]], 32)
  for (const p of s) {
    assert.ok(Math.abs(p[0] - p[1]) < 1e-6 && Math.abs(p[1] - p[2]) < 1e-6)
  }
})

test('samples are continuous — no jumps between neighbours', () => {
  const s = samplePath([[0, 0.5, 0], [0.3, 0.1, 1], [0.6, 0.9, 0], [1, 0.5, 1]], 128)
  for (let i = 1; i < s.length; i++) {
    const step = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1], s[i][2] - s[i - 1][2])
    assert.ok(step < 0.15, `neighbouring samples ${i - 1}->${i} jumped ${step}`)
  }
})

test('degenerate paths do not produce NaN', () => {
  assert.ok(finite(samplePath([[0.5, 0.5, 0.5], [0.5, 0.5, 0.5]], 16)), 'all points identical')
  assert.ok(finite(samplePath([[0, 0, 0], [1, 1, 1]], 2)), 'two samples only')
  assert.ok(finite(samplePath([] as Vec3[], 16)), 'empty path falls back')
  assert.ok(finite(samplePath([[0, 0, 0]] as Vec3[], 16)), 'single point falls back')
})
