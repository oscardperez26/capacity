/**
 * ActivityPanel.jsx — Sesión C (layout corregido)
 * Texto completo, scroll correcto, nombres sin recorte.
 */

import { useState, useMemo }  from 'react'
import { ChevronDown, ChevronUp, Plus, Star } from 'lucide-react'
import { CATS, MODEL_BADGE }  from '../../data/categories'
import { useStore }           from '../../context/StoreContext'
import Button                 from '../../components/ui/Button'

export default function ActivityPanel({ onAddOverride } = {}) {
  const { state, dispatch } = useStore()
  const favorites = state.favorites ?? []

  const [expanded,  setExpanded]  = useState(null)
  const [showFavs,  setShowFavs]  = useState(false)

  const onToggleFav = (id) => dispatch({ type: 'TOGGLE_FAV', id: String(id) })

  const allFavSubs = useMemo(() => {
    const r = []
    Object.values(CATS).forEach(c =>
      c.subs
        .filter(s => favorites.includes(String(s.id)) || favorites.includes(String(s.dbId)))
        .forEach(s => r.push({ ...s, cat: c }))
    )
    return r
  }, [favorites])

  const handleAdd = (sub, cat) => {
    if (onAddOverride) {
      onAddOverride(sub, cat)
    } else {
      dispatch({ type: 'ADD_TASK_OPTIMISTIC', sub, cat })
    }
  }

  const isFav = (sub) =>
    favorites.includes(String(sub.id)) || favorites.includes(String(sub.dbId))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, color: 'var(--t-muted)' }}>
          Actividades
        </span>
        <Button
          className={`btn-xs ${showFavs ? 'btn-warn' : 'btn-ghost'}`}
          onClick={() => setShowFavs(!showFavs)}
          style={{ gap: 3 }}
        >
          <Star size={9} fill={showFavs ? 'white' : 'none'} /> Recurrentes
        </Button>
      </div>

      {/* Favoritos */}
      {showFavs ? (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {allFavSubs.length === 0 ? (
            <div style={{ padding: '18px 8px', textAlign: 'center', color: 'var(--t-muted)', fontSize: 11 }}>
              Marca actividades con ⭐ para acceso rápido
            </div>
          ) : (
            allFavSubs.map(s => (
              <div
                key={s.id}
                className="cat-sub-row"
                onClick={() => handleAdd(s, s.cat)}
                style={{ background: 'var(--c-accent3)', borderRadius: 8, border: '1px solid rgba(51,40,154,0.14)', marginBottom: 3 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                  <span className={`badge ${MODEL_BADGE[s.m]}`} style={{ fontSize: 7.5, marginTop: 2 }}>{s.m}</span>
                </div>
                <div className="cat-sub-actions" style={{ opacity: 1, flexShrink: 0 }}>
                  <button className="star-btn on" onClick={e => { e.stopPropagation(); onToggleFav(s.id) }}>
                    <Star size={10} fill="#D97706" />
                  </button>
                  <button className="add-cat-btn"><Plus size={9} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Todas las categorías */
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(CATS).map(([k, cat]) => (
            <div key={k} style={{ borderRadius: 9, overflow: 'hidden', border: '1px solid var(--c-border)', flexShrink: 0 }}>

              {/* Header de categoría */}
              <button
                className="cat-hdr-btn"
                style={{ background: cat.color }}
                onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                  {cat.label}
                </span>
                <span style={{ flexShrink: 0, marginLeft: 4 }}>
                  {expanded === cat.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>

              {/* Subcategorías */}
              {expanded === cat.id && (
                <div style={{ background: 'var(--c-surface)' }}>
                  {cat.subs.map(sub => (
                    <div
                      key={sub.id}
                      className="cat-sub-row"
                      onClick={() => handleAdd(sub, cat)}
                      style={{ alignItems: 'flex-start', paddingTop: 8, paddingBottom: 8 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Nombre completo — sin truncar */}
                        <span style={{ fontSize: 10.5, lineHeight: 1.4, display: 'block', wordBreak: 'break-word' }}>
                          {sub.label}
                        </span>
                        <span className={`badge ${MODEL_BADGE[sub.m]}`} style={{ fontSize: 7.5, marginTop: 3 }}>
                          {sub.m}
                        </span>
                      </div>
                      <div className="cat-sub-actions" style={{ flexShrink: 0, marginTop: 2 }}>
                        <button
                          className={`star-btn ${isFav(sub) ? 'on' : ''}`}
                          onClick={e => { e.stopPropagation(); onToggleFav(sub.id) }}
                        >
                          <Star size={10} fill={isFav(sub) ? '#D97706' : 'none'} />
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
