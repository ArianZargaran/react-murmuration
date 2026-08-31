import { useEffect, useState, type ReactNode } from 'react'

// Two routes do not justify a routing dependency. This is the History API and
// a popstate listener; swap it for a real router the day there is a third page
// with params.

// Deployed under a subpath — GitHub Pages project sites serve from
// /<repo>/ — every route is prefixed. These two turn a browser pathname into
// an app route and back, and are pure so they can be tested without a browser.
export function stripBase(pathname: string, base: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  if (b && (pathname === b || pathname.startsWith(b + '/'))) {
    return pathname.slice(b.length) || '/'
  }
  return pathname || '/'
}

export function withBase(route: string, base: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base
  if (!b) return route
  return route === '/' ? b + '/' : b + route
}

// Optional-chained because this module is also imported outside Vite — the
// tests bundle it for Node, where import.meta has no env and a bare read would
// throw at import time.
const BASE = import.meta.env?.BASE_URL ?? '/'

export function useRoute() {
  const [path, setPath] = useState(() => stripBase(window.location.pathname, BASE))

  useEffect(() => {
    const onPop = () => setPath(stripBase(window.location.pathname, BASE))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return {
    path,
    navigate(to: string, keepQuery = true) {
      // Carry the tuning across routes, so the docs show what you have tuned
      // and coming back does not reset the studio. The gallery opts out — it
      // is not a view of the current tuning.
      const target = withBase(to, BASE)
      const url = to.includes('?') || !keepQuery ? target : target + window.location.search
      if (url === window.location.pathname + window.location.search) return
      window.history.pushState(null, '', url)
      setPath(to)
      window.scrollTo(0, 0)
    },
  }
}

// A real anchor, so the URL is visible on hover and modified clicks still do
// what the browser would do — open in a tab, open in a window, download.
export function Link({
  to,
  navigate,
  keepQuery = true,
  className,
  children,
}: {
  to: string
  navigate: (to: string, keepQuery?: boolean) => void
  keepQuery?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={keepQuery ? withBase(to, BASE) + window.location.search : withBase(to, BASE)}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        navigate(to, keepQuery)
      }}
    >
      {children}
    </a>
  )
}
