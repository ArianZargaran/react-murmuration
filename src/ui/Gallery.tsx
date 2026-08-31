import { useState } from 'react'
import { Link } from '../router'
import { encodeControls } from '../urlState'
import { loadAll, remove, rename, type Saved } from '../gallery'

// Saved tunings. Opening one is just a link back to the studio carrying its
// parameters, so the gallery stores no state the URL could not.
export function Gallery({ navigate }: { navigate: (to: string, keepQuery?: boolean) => void }) {
  const [entries, setEntries] = useState<Saved[]>(loadAll)

  const onRename = (id: string, name: string) => {
    rename(id, name)
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, name } : e)))
  }

  const onRemove = (id: string) => {
    remove(id)
    setEntries((list) => list.filter((e) => e.id !== id))
  }

  return (
    <div className="docs-page">
      <article className="docs gallery-page">
        <header className="docs-head">
          <div>
            <h2>Gallery</h2>
            <p>
              {entries.length
                ? `${entries.length} saved ${entries.length === 1 ? 'tuning' : 'tunings'}, in this browser.`
                : 'Nothing saved yet.'}
            </p>
          </div>
          <Link to="/" navigate={navigate} className="docs-back">
            ← Studio
          </Link>
        </header>

        {entries.length === 0 ? (
          <section>
            <p className="docs-note">
              Tune something in the studio and press <strong>Save</strong>. Entries live in
              this browser only — they are not synced, and clearing site data removes them.
              For anything you want to keep or share, the URL and the copy button both
              carry a tuning on their own.
            </p>
          </section>
        ) : (
          <ul className="gallery-grid">
            {entries.map((e) => (
              <li key={e.id} className="gallery-item">
                <button
                  type="button"
                  className="gallery-open"
                  onClick={() => navigate('/' + encodeControls(e.controls), false)}
                  title="Open in the studio"
                >
                  {e.thumb ? (
                    <img src={e.thumb} alt="" />
                  ) : (
                    <span className="gallery-nothumb">no preview</span>
                  )}
                </button>
                <div className="gallery-meta">
                  <input
                    className="gallery-name"
                    value={e.name}
                    aria-label="Name"
                    onChange={(ev) => onRename(e.id, ev.target.value)}
                  />
                  <button
                    type="button"
                    className="gallery-delete"
                    onClick={() => onRemove(e.id)}
                    aria-label={`Delete ${e.name}`}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
                <time className="gallery-date">
                  {new Date(e.savedAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
