import { useState } from 'react'
import { writeClipboard } from '../clipboard'

// A code sample you can read, with the copy attached to it rather than sitting
// somewhere else. Used by the studio and the docs so there is one of these.
export function Snippet({ code, className }: { code: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  async function copy() {
    setState((await writeClipboard(code)) ? 'copied' : 'error')
    setTimeout(() => setState('idle'), 1600)
  }

  return (
    <div className={className ? `snippet ${className}` : 'snippet'}>
      <div className="snippet-bar">
        <button type="button" className="snippet-copy" onClick={copy}>
          {state === 'copied' ? 'Copied' : state === 'error' ? 'Failed' : 'Copy'}
        </button>
      </div>
      <pre className="snippet-code">
        <code>{code.trimEnd()}</code>
      </pre>
    </div>
  )
}
