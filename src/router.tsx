import { useEffect, useState, type ReactNode } from 'react'

// Two routes do not justify a routing dependency. This is the History API and
// a popstate listener; swap it for a real router the day there is a third page
// with params.

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return {
    path,
    navigate(to: string, keepQuery = true) {
      // Carry the tuning across routes, so the docs show what you have tuned
      // and coming back does not reset the studio. The gallery opts out — it
      // is not a view of the current tuning.
      const url = to.includes('?') || !keepQuery ? to : to + window.location.search
      if (url === window.location.pathname + window.location.search) return
      window.history.pushState(null, '', url)
      setPath(new URL(url, window.location.origin).pathname)
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
      href={keepQuery ? to + window.location.search : to}
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
