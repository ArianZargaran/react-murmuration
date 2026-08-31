import { MURMURATION_DEFAULTS } from '../Murmuration'
import { GROUPS, EXTRA_PROPS, toParams } from '../params'
import { buildSnippet } from '../export'
import { Link } from '../router'
import { Snippet } from './Snippet'
import type { Controls } from '../controls'

// The library's documentation, rendered from the same spec the sidebar uses.
// The props reference is generated, so it cannot fall behind the parameters
// the component actually takes.

const PACKAGE = 'react-murmuration'


export function Docs({
  controls,
  navigate,
}: {
  controls: Controls
  navigate: (to: string) => void
}) {
  const snippet = buildSnippet(toParams(controls))

  return (
    <div className="docs-page">
      <article className="docs">
        <header className="docs-head">
          <div>
            <h2>{PACKAGE}</h2>
            <p>Particles advected along a noise flow field, on a 2D canvas.</p>
          </div>
          <Link to="/" navigate={navigate} className="docs-back">
            ← Studio
          </Link>
        </header>

        <section>
          <p className="docs-note">
            <strong>It is not a murmuration.</strong> A real murmuration is emergent: every
            bird runs local rules — separation, alignment, cohesion — and nobody dictates
            the global shape. Here the trajectory is dictated and the particles obey.
            There are no neighbour lookups anywhere in the package. The name is only
            about how it looks.
          </p>
        </section>

        <section>
          <h3>Install</h3>
          <Snippet code={`npm install ${PACKAGE}`} />
          <p>React 18 or 19, as a peer dependency.</p>
        </section>

        <section>
          <h3>Use</h3>
          <p>The canvas fills its parent, so give the parent a size.</p>
          <Snippet code={`import { Murmuration } from '${PACKAGE}'

<div style={{ width: '100%', height: 480 }}>
  <Murmuration />
</div>`} />
        </section>

        <section>
          <h3>What you have tuned</h3>
          <p>Every parameter is optional. This is the current state of the panel:</p>
          <Snippet code={snippet.trimEnd()} />
        </section>

        <section>
          <h3>Props</h3>
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h4>{group.title}</h4>
              <table className="docs-table">
                <tbody>
                  {group.items.map((spec) => (
                    <tr key={spec.key}>
                      <td className="docs-prop">{spec.key}</td>
                      <td className="docs-default">{String(MURMURATION_DEFAULTS[spec.key])}</td>
                      <td>
                        {spec.hint}{' '}
                        <span className="docs-range">
                          {spec.min}–{spec.max}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <h4>Other</h4>
          <table className="docs-table">
            <tbody>
              {EXTRA_PROPS.map(([name, def, note]) => (
                <tr key={name}>
                  <td className="docs-prop">{name}</td>
                  <td className="docs-default">{def}</td>
                  <td>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3>One parameter worth understanding</h3>
          <p>
            Particles moving through a slowly-changing flow field <em>always</em> collapse
            onto its attracting streamlines, leaving alternating dense lanes and empty
            voids. The only thing that prevents it is the field reorganising about as fast
            as they converge, which happens at roughly{' '}
            <code>turbulence × speed × noiseScale</code>.
          </p>
          <p>
            That is what <code>fieldDrift</code> sets. Low gives more structure and visible
            lanes; high gives an even but more restless field. It is a trade, not a setting
            with a right answer.
          </p>
        </section>

        <section>
          <h3>Without React</h3>
          <p>The simulation core imports nothing and knows nothing about React.</p>
          <Snippet code={`import { createField, MURMURATION_DEFAULTS } from '${PACKAGE}'

const field = createField(canvas, MURMURATION_DEFAULTS)
field.setParams({ speed: 480 })
field.destroy()`} />
        </section>
      </article>
    </div>
  )
}
