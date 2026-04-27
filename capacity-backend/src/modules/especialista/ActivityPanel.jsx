import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Plus, Star } from 'lucide-react'
import { CATS, MODEL_BADGE } from '../../data/categories'
import { useStore } from '../../context/StoreContext'
import Button from '../../components/ui/Button'

export default function ActivityPanel() {
  const { state, dispatch } = useStore()
  const { favorites } = state
  const [expanded, setExpanded] = useState(null)
  const [showFavs, setShowFavs] = useState(false)

  const allFavSubs = useMemo(() => {
    const r = []
    Object.values(CATS).forEach(c =>
      c.subs.filter(s => favorites.includes(s.id)).forEach(s => r.push({ ...s, cat: c }))
    )
    return r
  }, [favorites])

  const handleAdd = (sub, cat) => dispatch({ type: 'ADD_TASK', sub, cat })
  const handleFav = (id) => dispatch({ type: 'TOGGLE_FAV', id })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--t-muted)' }}>Actividades</span>
        <Button
          className={`btn-xs ${showFavs ? 'btn-warn' : 'btn-ghost'}`}
          onClick={() => setShowFavs(!showFavs)}
          style={{ gap: 3 }}
        >
          <Star size={9} fill={showFavs ? 'white' : 'none'} /> Recurrentes
        </Button>
      </div>

      {/* Favourites view */}
      {showFavs ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
          {allFavSubs.length === 0 ? (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--t-muted)', fontSize: 11 }}>
              Marca actividades con ⭐
            </div>
          ) : (
            allFavSubs.map(s => (
              <div
                key={s.id}
                className="cat-sub-row"
                onClick={() => handleAdd(s, s.cat)}
                style={{ background: 'var(--c-accent3)', borderRadius: 8, border: '1px solid rgba(51,40,154,0.14)' }}
              >
                <div>
                  <span style={{ fontSize: 10.5, fontWeight: 600 }}>{s.label}</span>
                  <div><span className={`badge ${MODEL_BADGE[s.m]}`} style={{ fontSize: 7.5, marginTop: 2 }}>{s.m}</span></div>
                </div>
                <div className="cat-sub-actions" style={{ opacity: 1 }}>
                  <button className="star-btn on" onClick={e => { e.stopPropagation(); handleFav(s.id) }}>
                    <Star size={10} fill="#D97706" />
                  </button>
                  <button className="add-cat-btn"><Plus size={9} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* All categories */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
          {Object.entries(CATS).map(([k, cat]) => (
            <div key={k} style={{ borderRadius: 9, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
              <button
                className="cat-hdr-btn"
                style={{ background: cat.color }}
                onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              >
                <span>{cat.label}</span>
                {expanded === cat.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {expanded === cat.id && (
                <div style={{ background: 'var(--c-surface)' }}>
                  {cat.subs.map(sub => (
                    <div
                      key={sub.id}
                      className="cat-sub-row"
                      onClick={() => handleAdd(sub, cat)}
                    >
                      <div>
                        <span style={{ fontSize: 10.5 }}>{sub.label}</span>
                        <div><span className={`badge ${MODEL_BADGE[sub.m]}`} style={{ fontSize: 7.5, marginTop: 2 }}>{sub.m}</span></div>
                      </div>
                      <div className="cat-sub-actions">
                        <button
                          className={`star-btn ${favorites.includes(sub.id) ? 'on' : ''}`}
                          onClick={e => { e.stopPropagation(); handleFav(sub.id) }}
                        >
                          <Star size={10} fill={favorites.includes(sub.id) ? '#D97706' : 'none'} />
                        </button>
                        <button className="add-cat-btn"><Plus size={9} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
