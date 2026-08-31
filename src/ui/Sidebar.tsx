import type { Swatch } from '../palettes'
import type { Controls } from '../controls'
import { GROUPS, type Spec } from '../params'
import { Link } from '../router'
import { Snippet } from './Snippet'
import { PathEditor } from './PathEditor'
import { MURMURATION_DEFAULTS } from '../Murmuration'

type Props = {
  value: Controls
  palettes: Swatch[]
  fps: number
  snippet: string
  onChange: (patch: Partial<Controls>) => void
  onReset: () => void
  onSave: () => void
  saveState: string | null
  navigate: (to: string) => void
  isDefault: boolean
}

function Slider({
  spec,
  value,
  onChange,
}: {
  spec: Spec
  value: number
  onChange: (v: number) => void
}) {
  const id = `ctl-${spec.key}`
  return (
    <div className="control">
      <div className="control-head">
        <label className="control-label" htmlFor={id}>{spec.label}</label>
        <span className="control-value">
          {spec.format ? spec.format(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="control-hint">{spec.hint}</p>
    </div>
  )
}

export function Sidebar({
  value,
  palettes,
  fps,
  snippet,
  onChange,
  onReset,
  onSave,
  saveState,
  navigate,
  isDefault,
}: Props) {
  return (
    <aside className="sidebar">
      <header className="sidebar-head">
        <div className="sidebar-title">
          <h1>murmuration</h1>
          <nav className="sidebar-nav">
            <Link to="/gallery" navigate={navigate} keepQuery={false} className="docs-open">
              Gallery
            </Link>
            <Link to="/docs" navigate={navigate} className="docs-open">
              Docs
            </Link>
          </nav>
        </div>
        <p>Directed, not emergent. The trajectory is dictated; particles follow.</p>
      </header>

      {GROUPS.map((group) => (
        <details className="group" key={group.title} open={group.open}>
          <summary className="group-title">{group.title}</summary>
          {group.title === 'Path' && (
            <PathEditor
              path={value.path}
              box={{ width: value.boxWidth, height: value.boxHeight, depth: value.boxDepth }}
              onChange={(path) => onChange({ path })}
              onReset={() => onChange({ path: MURMURATION_DEFAULTS.path })}
            />
          )}
          {group.items.map((spec) => (
            <Slider
              key={spec.key}
              spec={spec}
              value={value[spec.key]}
              onChange={(v) => onChange({ [spec.key]: v } as Partial<Controls>)}
            />
          ))}
        </details>
      ))}

      <details className="group" open>
        <summary className="group-title">Palette</summary>
        <div className="control">
          <div className="control-head">
            <span className="control-label">Colours</span>
            <span className="control-value">{palettes[value.paletteIndex].name}</span>
          </div>
          <div className="swatches">
            {palettes.map((p, i) => (
              <button
                key={p.name}
                type="button"
                className={i === value.paletteIndex ? 'swatch is-active' : 'swatch'}
                onClick={() => onChange({ paletteIndex: i })}
                aria-label={p.name}
                aria-pressed={i === value.paletteIndex}
                style={{ backgroundImage: `linear-gradient(90deg, ${p.stops.join(', ')})` }}
              />
            ))}
          </div>
        </div>
      </details>

      <details className="group" open>
        <summary className="group-title">Code</summary>
        <Snippet code={snippet} />
      </details>

      <footer className="sidebar-foot">
        <button
          type="button"
          className="reset"
          onClick={onReset}
          disabled={isDefault}
          title="Back to the tuned defaults"
        >
          Reset
        </button>
        <button type="button" className="reset" onClick={onSave}>
          {saveState ?? 'Save'}
        </button>
        <span className="fps">{Math.round(fps)} fps</span>
      </footer>
    </aside>
  )
}
