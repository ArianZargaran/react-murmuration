import { useRef, useState } from 'react'
import { samplePath, type Vec3 } from '../Murmuration'

// Three orthographic views of the dictated path — front, zenithal, lateral —
// each editing the two axes it can see and leaving the third alone. Drawn from
// the library's own sampler, so the curve on screen is the curve particles fly.

type Axis = 0 | 1 | 2

type ViewSpec = {
  label: string
  hint: string
  h: Axis // which component runs left-to-right
  v: Axis // which runs top-to-bottom
  size: (b: Box) => [number, number]
}

type Box = { width: number; height: number; depth: number }

const VIEWS: ViewSpec[] = [
  { label: 'Front', hint: 'x / y', h: 0, v: 1, size: (b) => [b.width, b.height] },
  { label: 'Zenithal', hint: 'x / z — from above', h: 0, v: 2, size: (b) => [b.width, b.depth] },
  { label: 'Lateral', hint: 'z / y — from the side', h: 2, v: 1, size: (b) => [b.depth, b.height] },
]

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)

function View({
  spec,
  box,
  path,
  onChange,
}: {
  spec: ViewSpec
  box: Box
  path: Vec3[]
  onChange: (path: Vec3[]) => void
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<number | null>(null)

  // A real aspect ratio rather than a stretched viewBox, so handles stay round
  // and a deep, short box looks deep and short.
  const [aw, ah] = spec.size(box)
  const w = Math.max(aw, 1)
  const h = Math.max(ah, 1)

  const at = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = ref.current!.getBoundingClientRect()
    return [clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height)]
  }

  const move = (index: number, hv: number, vv: number) => {
    const next = path.map((p, i) => (i === index ? ([...p] as Vec3) : p))
    next[index][spec.h] = hv
    next[index][spec.v] = vv
    onChange(next)
  }

  // Insert into whichever segment the click is nearest, so a new point lands
  // where you pointed instead of on the end.
  const insert = (hv: number, vv: number) => {
    let best = 1
    let bestDist = Infinity
    for (let i = 0; i < path.length - 1; i++) {
      const mh = (path[i][spec.h] + path[i + 1][spec.h]) / 2
      const mv = (path[i][spec.v] + path[i + 1][spec.v]) / 2
      const d = (mh - hv) ** 2 + (mv - vv) ** 2
      if (d < bestDist) { bestDist = d; best = i + 1 }
    }
    const from = path[Math.min(best, path.length - 1)]
    const point: Vec3 = [from[0], from[1], from[2]]
    point[spec.h] = hv
    point[spec.v] = vv
    onChange([...path.slice(0, best), point, ...path.slice(best)])
  }

  const curve = samplePath(path, 80)
    .map((p) => `${p[spec.h] * w},${p[spec.v] * h}`)
    .join(' ')

  return (
    <div className="pv">
      <div className="pv-head">
        <span className="pv-label">{spec.label}</span>
        <span className="pv-hint">{spec.hint}</span>
      </div>
      <svg
        ref={ref}
        className="pv-svg"
        viewBox={`0 0 ${w} ${h}`}
        style={{ aspectRatio: `${w} / ${h}` }}
        onDoubleClick={(e) => {
          const [hv, vv] = at(e)
          insert(hv, vv)
        }}
        onPointerMove={(e) => {
          if (drag === null) return
          const [hv, vv] = at(e)
          move(drag, hv, vv)
        }}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <rect x={0} y={0} width={w} height={h} className="pv-frame" vectorEffect="non-scaling-stroke" />
        <polyline points={curve} className="pv-curve" vectorEffect="non-scaling-stroke" />
        {path.map((p, i) => (
          <circle
            key={i}
            cx={p[spec.h] * w}
            cy={p[spec.v] * h}
            r={Math.max(w, h) * 0.014}
            className={drag === i ? 'pv-dot is-drag' : 'pv-dot'}
            onPointerDown={(e) => {
              e.stopPropagation()
              // Alt-click removes, as long as a path remains.
              if (e.altKey && path.length > 2) {
                onChange(path.filter((_, j) => j !== i))
                return
              }
              ;(e.target as Element).releasePointerCapture?.(e.pointerId)
              setDrag(i)
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export function PathEditor({
  path,
  box,
  onChange,
  onReset,
}: {
  path: Vec3[]
  box: Box
  onChange: (path: Vec3[]) => void
  onReset: () => void
}) {
  return (
    <div className="path-editor">
      {VIEWS.map((spec) => (
        <View key={spec.label} spec={spec} box={box} path={path} onChange={onChange} />
      ))}
      <div className="pv-foot">
        <span className="control-hint">
          Drag to move · double-click to add · ⌥-click to remove
        </span>
        <button type="button" className="reset" onClick={onReset}>
          Reset path
        </button>
      </div>
    </div>
  )
}
