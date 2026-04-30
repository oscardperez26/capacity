import './ActivityPanel.css'
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Plus, Star } from 'lucide-react'
import { CATS, MODEL_BADGE } from '../../data/categories'
import { useStore } from '../../context/StoreContext'
import Button from '../../components/ui/Button'

export default function ActivityPanel({ onAddOverride } = {}) {
  const { state, dispatch } = useStore()
  const favorites = state.favorites ?? []
  const [expanded, setExpanded] = useState(null)
  const [showFavs, setShowFavs] = useState(false)

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
    <div className="ap-container">
      {/* Header */}
      <div className="ap-header">
        <span className="ap-title">Actividades</span>
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
        <div className="ap-scroll">
          {allFavSubs.length === 0 ? (
            <div className="ap-empty-msg">
              Marca actividades con ⭐ para acceso rápido
            </div>
          ) : (
            allFavSubs.map(s => (
              <div
                key={s.id}
                className="cat-sub-row ap-fav-item"
                onClick={() => handleAdd(s, s.cat)}
              >
                <div className="ap-fav-inner">
                  <span className="ap-fav-label">{s.label}</span>
                  <span className={`badge ${MODEL_BADGE[s.m]} ap-fav-badge`}>{s.m}</span>
                </div>
                <div className="cat-sub-actions ap-fav-actions">
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
        <div className="ap-cat-list">
          {Object.entries(CATS).map(([k, cat]) => (
            <div key={k} className="ap-cat-item">
              {/* Header de categoría */}
              <button
                className="cat-hdr-btn"
                style={{ background: cat.color }}
                onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              >
                <span className="ap-cat-hdr-text">{cat.label }</span>
                <span className="ap-cat-hdr-icon">
                  {expanded === cat.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>

              {/* Subcategorías */}
              {expanded === cat.id && (
                <div className="ap-cat-body">
                  {cat.subs.map(sub => (
                    <div
                      key={sub.id}
                      className="cat-sub-row"
                      onClick={() => handleAdd(sub, cat)}
                      style={{ alignItems: 'flex-start', paddingTop: 8, paddingBottom: 8 }}
                    >
                      <div className="ap-sub-inner">
                        <span className="ap-sub-label">{sub.label}</span>
                        <span className={`badge ${MODEL_BADGE[sub.m]} ap-sub-badge`}>{sub.m}</span>
                      </div>
                      <div className="cat-sub-actions ap-sub-actions">
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
