import { MURMURATION_DEFAULTS, type MurmurationParams } from './Murmuration'

// The export is the call site, not the component. Consumers install the package
// and paste this; it carries whatever was tuned here.
//
// Only values that differ from the package's own defaults are emitted, so an
// untouched field is just <Murmuration />. controls.ts derives the tool's
// starting values from those same defaults, so the two cannot drift apart —
// but note this does couple a snippet to the package version it was tuned
// against, since an omitted prop means "whatever that version defaults to".

// The published package name, not a relative path — consumers install this,
// they do not vendor the file.
const IMPORT = "import { Murmuration } from 'react-murmuration'"

const EPSILON = 1e-9

const samePalette = (a: MurmurationParams['palette'], b: MurmurationParams['palette']) =>
  a.background === b.background && a.stops.join() === b.stops.join()

export function buildSnippet(p: MurmurationParams): string {
  const keys = Object.keys(p) as (keyof MurmurationParams)[]

  const props = keys
    .filter((k) => k !== 'palette' && k !== 'path')
    // Slider steps do not always land on a clean decimal, so compare loosely
    // rather than leaving a prop in the snippet over a rounding artefact.
    .filter((k) => Math.abs((p[k] as number) - (MURMURATION_DEFAULTS[k] as number)) > EPSILON)
    .map((k) => `  ${k}={${p[k]}}`)

  const samePath =
    p.path.length === MURMURATION_DEFAULTS.path.length &&
    p.path.every((pt, i) => pt.every((v, j) => v === MURMURATION_DEFAULTS.path[i][j]))
  if (!samePath) {
    const pts = p.path.map((pt) => `    [${pt.map((v) => +v.toFixed(3)).join(', ')}],`).join('\n')
    props.push(`  path={[\n${pts}\n  ]}`)
  }

  if (!samePalette(p.palette, MURMURATION_DEFAULTS.palette)) {
    const stops = p.palette.stops.map((s) => `'${s}'`).join(', ')
    props.push(
      `  palette={{\n    background: '${p.palette.background}',\n    stops: [${stops}],\n  }}`
    )
  }

  const tag = props.length ? `<Murmuration\n${props.join('\n')}\n/>` : '<Murmuration />'

  return `${IMPORT}\n\n${tag}\n`
}
