import { useRef, useState } from 'react'
import { PALETTES } from '../palettes'
import { Murmuration } from '../Murmuration'
import { DEFAULTS, type Controls } from '../controls'
import { buildSnippet } from '../export'
import { toParams } from '../params'
import { Sidebar } from './Sidebar'
import { captureThumb, save } from '../gallery'

// The tuning surface: the effect full-bleed, the controls over it.
export function Studio({
  controls,
  setControls,
  navigate,
}: {
  controls: Controls
  setControls: (c: Controls | ((c: Controls) => Controls)) => void
  navigate: (to: string) => void
}) {
  const [fps, setFps] = useState(60)
  const [saveState, setSaveState] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const params = toParams(controls)
  const isDefault = (Object.keys(DEFAULTS) as (keyof Controls)[]).every(
    (k) => controls[k] === DEFAULTS[k]
  )

  // The thumbnail is the frame that is actually on screen. Reaching for the
  // canvas through the DOM keeps this entirely tool-side; the published
  // component does not grow a ref just so the studio can screenshot it.
  function saveTuning() {
    const canvas = stageRef.current?.querySelector('canvas') ?? null
    const result = save(controls, captureThumb(canvas))
    setSaveState(result.ok ? 'Saved' : result.reason)
    setTimeout(() => setSaveState(null), result.ok ? 1600 : 4000)
  }

  return (
    <>
      {/* The shell renders the same component it hands out, so the preview is
          the artefact rather than a second implementation of it. */}
      <div className="stage" ref={stageRef}>
        <Murmuration {...params} onFps={setFps} />
      </div>
      <Sidebar
        value={controls}
        palettes={PALETTES}
        fps={fps}
        snippet={buildSnippet(params)}
        onChange={(patch) => setControls((c) => ({ ...c, ...patch }))}
        onReset={() => setControls(DEFAULTS)}
        onSave={saveTuning}
        saveState={saveState}
        isDefault={isDefault}
        navigate={navigate}
      />
    </>
  )
}
