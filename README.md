# react-murmuration

Tens of thousands of particles advected along a noise flow field, on a 2D canvas.

**It is not a murmuration.** A real murmuration is emergent: every bird runs local
rules — separation, alignment, cohesion — and nobody dictates the global shape.
Here the trajectory is dictated and the particles obey. There are no neighbour
lookups anywhere in this package. The name is only about how it looks.

Canvas 2D rather than WebGL, on purpose: one file, no shaders, no buffers, and
you can read the whole simulation.

## Install

```bash
npm install react-murmuration
```

React 18 or 19, as a peer dependency.

## Use

```tsx
import { Murmuration } from 'react-murmuration'

<div style={{ width: '100%', height: 480 }}>
  <Murmuration />
</div>
```

The canvas fills its parent, so give the parent a size. Every parameter is
optional and falls back to a tuned default.

```tsx
<Murmuration speed={480} trail={0.9} bandWidth={0.3} />
```

## The path

The trajectory is dictated, and `path` is how you dictate it: a list of
`[x, y, z]` points, each `0..1` inside a box you size with `boxWidth`,
`boxHeight` and `boxDepth`. Particles are carried along a spline through those
points, spread through the tube around it, and drawn orthographically from the
front with distance dimming and thinning them.

```tsx
<Murmuration
  path={[
    [0, 0.5, 0],
    [0.35, 0.2, 1],
    [0.7, 0.8, 0],
    [1, 0.5, 1],
  ]}
  boxDepth={900}
/>
```

Two points is a straight line. The box is fitted into the canvas and centred, so
a composition is the same picture whatever size the window is.

## Props

All optional. Defaults are exported as `MURMURATION_DEFAULTS`.

<!-- props:start -->

### Flow

| Prop | Default | |
|---|---|---|
| `count` | `32000` | How many particles run the flow. Range `2000`–`120000`. |
| `speed` | `300` | Pixels per second. Range `40`–`800`. |
| `noiseScale` | `3.5` | Field zoom. Low is broad, high is busy. Range `0.5`–`14`. |
| `turbulence` | `1.15` | How far noise swings a particle off the dictated path. Range `0`–`3`. |
| `dispersal` | `0.35` | How freely particles leak out of the flow. Range `0`–`1`. |
| `fieldDrift` | `6` | How fast the field reorganises. Low lets density bake into lanes. Range `0`–`20`. |
| `octaveGain` | `0.45` | Weight of the finer octave. Zero is one smooth scale. Range `0`–`1`. |
| `lacunarity` | `2.7` | Frequency step between the two octaves. Range `1.2`–`6`. |

### Path

| Prop | Default | |
|---|---|---|
| `bandWidth` | `0.23` | Radius of the tube around the path, as a fraction of height. Range `0.02`–`0.5`. |
| `boxWidth` | `1600` | The volume the flow is composed inside. Range `400`–`3000`. |
| `boxHeight` | `900` | Fitted into the canvas, so composition survives a resize. Range `300`–`2000`. |
| `boxDepth` | `700` | How far the path may travel toward and away from you. Range `0`–`2000`. |

### Velocity

| Prop | Default | |
|---|---|---|
| `coreSpeed` | `0.3` | Speed on the centreline. Low gives a dense slow core. Range `0.05`–`2`. |
| `edgeSpeed` | `1.55` | Speed at the band edge. High elongates the rim into streaks. Range `0.05`–`3`. |
| `speedJitter` | `0.25` | Per-particle variation around that. Range `0`–`1`. |

### Lifetime

| Prop | Default | |
|---|---|---|
| `lifespan` | `4.6` | Seconds a particle lives at most. Range `0.3`–`12`. |
| `lifeJitter` | `0.76` | Spread below that, so respawns never pulse together. Range `0`–`0.95`. |

### Render

| Prop | Default | |
|---|---|---|
| `size` | `1` | Stroke width. Thin is hair, thick is smoke. Range `0.3`–`3`. |
| `stretch` | `0.5` | How hard width reacts to speed. Zero is uniform width. Range `0`–`1.5`. |
| `ink` | `0.32` | Per-stroke opacity, so density builds gradually. Range `0.02`–`1`. |
| `trail` | `0.6` | How much of the previous frame survives. Range `0`–`0.99`. |
| `depthFade` | `0.55` | How much distance dims and thins a particle. Range `0`–`1`. |

### Other

| Prop | Default | |
|---|---|---|
| `path` | `6-point arc` | The dictated trajectory: points of [x, y, z], each 0..1 in box space. |
| `palette` | `Ember` | { background, stops }. Colour is sampled along the path, not per particle. |
| `className` | `—` | Passed to the canvas. |
| `style` | `—` | Merged over the canvas style. |
| `onFps` | `—` | Called with a smoothed frames-per-second reading. |

<!-- props:end -->

## A note on `fieldDrift`

It is the one parameter worth understanding before you touch it. Particles
moving through a slowly-changing flow field **always** collapse onto its
attracting streamlines, leaving alternating dense lanes and empty voids. The
only thing that prevents it is the field reorganising about as fast as they
converge, which happens at roughly `turbulence × speed × noiseScale`.

Low values give more structure and visible lanes. High values give an even but
more restless field. It is a trade, not a setting with a right answer.

## Without React

The simulation core imports nothing and knows nothing about React:

```ts
import { createField, MURMURATION_DEFAULTS } from 'react-murmuration'

const field = createField(canvas, MURMURATION_DEFAULTS)
field.setParams({ speed: 480 })
field.destroy()
```

## Licence

MIT
