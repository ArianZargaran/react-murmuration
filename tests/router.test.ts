import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stripBase, withBase } from '../src/router'

test('at the site root the base is a no-op', () => {
  assert.equal(stripBase('/', '/'), '/')
  assert.equal(stripBase('/docs', '/'), '/docs')
  assert.equal(withBase('/docs', '/'), '/docs')
  assert.equal(withBase('/', '/'), '/')
})

test('under a subpath, routes strip and restore', () => {
  const base = '/react-murmuration/'
  assert.equal(stripBase('/react-murmuration/', base), '/')
  assert.equal(stripBase('/react-murmuration/docs', base), '/docs')
  assert.equal(stripBase('/react-murmuration/gallery', base), '/gallery')
  assert.equal(withBase('/', base), '/react-murmuration/')
  assert.equal(withBase('/docs', base), '/react-murmuration/docs')
})

test('a path outside the base is left alone rather than mangled', () => {
  assert.equal(stripBase('/somewhere-else/docs', '/react-murmuration/'), '/somewhere-else/docs')
})

test('a base that only prefixes by coincidence is not stripped', () => {
  // /react-murmuration-docs must not be read as the base plus "-docs"
  assert.equal(stripBase('/react-murmuration-docs', '/react-murmuration/'), '/react-murmuration-docs')
})

test('round trip is stable for every route', () => {
  for (const base of ['/', '/app/', '/react-murmuration/']) {
    for (const route of ['/', '/docs', '/gallery']) {
      assert.equal(stripBase(withBase(route, base), base), route, `${base} ${route}`)
    }
  }
})
