import { PALETTES } from './palettes'
import type { Controls } from './controls'
import type { MurmurationParams } from './Murmuration'

// Controls carry a palette index; the component wants the palette itself. That
// is the only difference between the two shapes.
export const toParams = ({ paletteIndex, ...rest }: Controls): MurmurationParams => ({
  ...rest,
  palette: PALETTES[paletteIndex],
})

// The control spec, owned here rather than by the sidebar, because the docs
// panel renders the same list as a props reference. One source, so the panel
// and the reference cannot disagree about what a parameter does or ranges to.

// Only the parameters that are a single number get a slider. Derived, so
// adding a non-numeric parameter cannot silently land in the control list.
type NumericKey = { [K in keyof Controls]-?: Controls[K] extends number ? K : never }[keyof Controls]
export type Key = Exclude<NumericKey, 'paletteIndex'>

export type Spec = {
  key: Key
  label: string
  hint: string
  min: number
  max: number
  step: number
  format?: (v: number) => string
}

// The controls as data. Adding a parameter is a row here rather than a block of
// JSX, and the groups are what keep twenty-odd sliders navigable.
export const GROUPS: { title: string; open?: boolean; items: Spec[] }[] = [
  {
    title: 'Flow',
    open: true,
    items: [
      { key: 'count', label: 'Particles', hint: 'How many particles run the flow.',
        min: 2000, max: 120000, step: 1000, format: (v) => `${(v / 1000).toFixed(0)}k` },
      { key: 'speed', label: 'Speed', hint: 'Pixels per second.',
        min: 40, max: 800, step: 10, format: (v) => `${v}` },
      { key: 'noiseScale', label: 'Noise scale', hint: 'Field zoom. Low is broad, high is busy.',
        min: 0.5, max: 14, step: 0.1 },
      { key: 'turbulence', label: 'Turbulence', hint: 'How far noise swings a particle off the dictated path.',
        min: 0, max: 3, step: 0.05 },
      { key: 'dispersal', label: 'Dispersal', hint: 'How freely particles leak out of the flow.',
        min: 0, max: 1, step: 0.01 },
      { key: 'fieldDrift', label: 'Field drift', hint: 'How fast the field reorganises. Low lets density bake into lanes.',
        min: 0, max: 20, step: 0.5 },
      { key: 'octaveGain', label: 'Detail', hint: 'Weight of the finer octave. Zero is one smooth scale.',
        min: 0, max: 1, step: 0.01 },
      { key: 'lacunarity', label: 'Detail scale', hint: 'Frequency step between the two octaves.',
        min: 1.2, max: 6, step: 0.1 },
    ],
  },
  {
    title: 'Path',
    items: [
      { key: 'bandWidth', label: 'Spread', hint: 'Radius of the tube around the path, as a fraction of height.',
        min: 0.02, max: 0.5, step: 0.01 },
      { key: 'boxWidth', label: 'Box width', hint: 'The volume the flow is composed inside.',
        min: 400, max: 3000, step: 20, format: (v) => `${v}` },
      { key: 'boxHeight', label: 'Box height', hint: 'Fitted into the canvas, so composition survives a resize.',
        min: 300, max: 2000, step: 20, format: (v) => `${v}` },
      { key: 'boxDepth', label: 'Box depth', hint: 'How far the path may travel toward and away from you.',
        min: 0, max: 2000, step: 20, format: (v) => `${v}` },
    ],
  },
  {
    title: 'Velocity',
    items: [
      { key: 'coreSpeed', label: 'Core speed', hint: 'Speed on the centreline. Low gives a dense slow core.',
        min: 0.05, max: 2, step: 0.05 },
      { key: 'edgeSpeed', label: 'Edge speed', hint: 'Speed at the band edge. High elongates the rim into streaks.',
        min: 0.05, max: 3, step: 0.05 },
      { key: 'speedJitter', label: 'Speed jitter', hint: 'Per-particle variation around that.',
        min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Lifetime',
    items: [
      { key: 'lifespan', label: 'Lifespan', hint: 'Seconds a particle lives at most.',
        min: 0.3, max: 12, step: 0.1 },
      { key: 'lifeJitter', label: 'Life jitter', hint: 'Spread below that, so respawns never pulse together.',
        min: 0, max: 0.95, step: 0.01 },
    ],
  },
  {
    title: 'Render',
    open: true,
    items: [
      { key: 'size', label: 'Size', hint: 'Stroke width. Thin is hair, thick is smoke.',
        min: 0.3, max: 3, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
      { key: 'stretch', label: 'Stretch', hint: 'How hard width reacts to speed. Zero is uniform width.',
        min: 0, max: 1.5, step: 0.05 },
      { key: 'ink', label: 'Ink', hint: 'Per-stroke opacity, so density builds gradually.',
        min: 0.02, max: 1, step: 0.01 },
      { key: 'trail', label: 'Trail', hint: 'How much of the previous frame survives.',
        min: 0, max: 0.99, step: 0.01 },
      { key: 'depthFade', label: 'Depth fade', hint: 'How much distance dims and thins a particle.',
        min: 0, max: 1, step: 0.01 },
    ],
  },
]

// Props that are not a single number, so they have no slider but still need
// documenting. Shared by the docs panel and the README generator.
export const EXTRA_PROPS: [name: string, def: string, note: string][] = [
  ['path', '6-point arc', 'The dictated trajectory: points of [x, y, z], each 0..1 in box space.'],
  ['palette', 'Ember', '{ background, stops }. Colour is sampled along the path, not per particle.'],
  ['className', '—', 'Passed to the canvas.'],
  ['style', '—', 'Merged over the canvas style.'],
  ['onFps', '—', 'Called with a smoothed frames-per-second reading.'],
]
