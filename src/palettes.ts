import type { Palette } from './Murmuration'

// The studio's swatch list. A name is a tool concept — the library never reads
// it — so it lives here rather than in the published Palette type.
export type Swatch = Palette & { name: string }

export const PALETTES: Swatch[] = [
  {
    name: 'Ember',
    background: '#07060a',
    stops: ['#16255f', '#5c1cb4', '#c81f63', '#e8642f', '#e8a25a'],
  },
  {
    name: 'Chlorine',
    background: '#04090c',
    stops: ['#04364a', '#0a9396', '#57e2b0', '#c9f26b', '#f0fdd0'],
  },
  {
    name: 'Graphite',
    background: '#0a0a0b',
    stops: ['#1c1c22', '#4a4a58', '#9a9aae', '#e6e6f0', '#ffffff'],
  },
]
