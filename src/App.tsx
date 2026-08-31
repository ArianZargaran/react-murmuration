import { useEffect, useState } from 'react'
import { type Controls } from './controls'
import { decodeControls, encodeControls } from './urlState'
import { useRoute } from './router'
import { Studio } from './ui/Studio'
import { Docs } from './ui/Docs'
import { Gallery } from './ui/Gallery'

export default function App() {
  const { path, navigate } = useRoute()

  // The URL is the source of truth for a tuning, so a link restores it and a
  // trip to the docs and back does not throw it away.
  const [controls, setControls] = useState<Controls>(() =>
    decodeControls(window.location.search)
  )

  // replaceState, not pushState: a slider drag fires continuously and would
  // otherwise bury the back button under hundreds of entries.
  useEffect(() => {
    const next = window.location.pathname + encodeControls(controls)
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, '', next)
    }
  }, [controls])

  // Back and forward across whole tunings still work, because those do fire
  // popstate and we re-read the URL when they do.
  useEffect(() => {
    const onPop = () => setControls(decodeControls(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (path === '/docs') return <Docs controls={controls} navigate={navigate} />
  if (path === '/gallery') return <Gallery navigate={navigate} />
  return <Studio controls={controls} setControls={setControls} navigate={navigate} />
}
