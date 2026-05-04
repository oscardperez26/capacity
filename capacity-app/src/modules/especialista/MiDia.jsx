/**
 * MiDia.jsx — reglas de negocio completas
 * - borrador   → editable libremente
 * - finalizado/enviado → solo lectura (bloqueado)
 * - aprobado   → solo lectura definitiva
 * - rechazado  → editable SOLO si habilitado_edicion=1 (jefe habilitó)
 */

import './MiDia.css'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Calendar, Folder, CheckCircle, AlertCircle, Lock, Edit3, WifiOff, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence }   from 'framer-motion'
import { useStore }                  from '../../context/StoreContext'
import { useCapacity }               from '../../hooks/useCapacity'
import { useSprintContext }           from '../../context/SprintContext'
import { isFestivo, CATS }           from '../../data/categories'
import { minsToH }                   from '../../utils/capacityUtils'
import * as entriesService           from '../../services/entriesService'
import { api }                       from '../../lib/apiClient'
import ProgressBar                   from '../../components/ui/ProgressBar'
import Modal                         from '../../components/ui/Modal'
import Button                        from '../../components/ui/Button'
import SprintBar                     from '../../components/SprintBar'
import ActivityCard                  from './ActivityCard'
import ActivityPanel                 from './ActivityPanel'

function getEditState(entry) {
  const status     = entry.status
  const habilitado = entry.habilitado === 1
  if (status === 'aprobado')                     return { locked: true,  editable: false, tag: 'aprobado'   }
  if (status === 'enviado'   && !habilitado)     return { locked: true,  editable: false, tag: 'enviado'    }
  if (status === 'rechazado' && !habilitado)     return { locked: true,  editable: false, tag: 'rechazado'  }
  if (status === 'rechazado' && habilitado)      return { locked: false, editable: true,  tag: 'corrigiendo' }
  if (status === 'finalizado')                   return { locked: true,  editable: false, tag: 'enviado'    }
  return { locked: false, editable: true, tag: 'borrador' }
}

function CapacityBar({ total }) {
  const MIN_ESP = 528
  const pct   = Math.round((total / MIN_ESP) * 100)
  const color = total > 480 ? 'var(--brand-red)' : total > 384 ? 'var(--brand-orange)' : 'var(--brand-green)'
  return (
    <div className="cap-bar-wrap">
      <div className="cap-bar-hdr">
        <span className="cap-bar-mins" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>
          {total} min &nbsp;·&nbsp; {minsToH(total)}
        </span>
        <span className="cap-bar-pct" style={{ color }}>{pct}% capacity</span>
      </div>
      <ProgressBar pct={Math.min(pct, 100)} showLabel={false} />
    </div>
  )
}

function EstadoBanner({ tag }) {
  const cfg = {
    aprobado:    { bg: 'rgba(48,105,59,0.09)',  border: 'rgba(48,105,59,0.25)',  color: '#30693B', icon: <CheckCircle size={14}/>, msg: 'Jornada aprobada — solo lectura' },
    enviado:     { bg: 'rgba(62,93,157,0.09)',  border: 'rgba(62,93,157,0.25)',  color: '#3E5D9D', icon: <Lock size={14}/>,        msg: 'Jornada enviada — pendiente de aprobación' },
    rechazado:   { bg: 'rgba(153,44,38,0.09)',  border: 'rgba(153,44,38,0.25)',  color: '#992C26', icon: <AlertCircle size={14}/>, msg: 'Jornada rechazada — ve a Histórico para corregir' },
    corrigiendo: { bg: 'rgba(214,88,48,0.09)',  border: 'rgba(214,88,48,0.25)',  color: '#D65830', icon: <Edit3 size={14}/>,       msg: 'Corrigiendo jornada rechazada — puedes editar y reenviar' },
  }[tag]
  if (!cfg) return null
  return (
    <div className="estado-banner" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.icon} {cfg.msg}
    </div>
  )
}

export default function MiDia({ user }) {
  const { state, dispatch }  = useStore()
  const [modal, setModal]    = useState(null)
  const [saving, setSaving]  = useState(false)
  const [proyectos, setProyectos] = useState([])

  useEffect(() => {
    api.get('/mis-proyectos/selector')
      .then(r => setProyectos(r.data ?? []))
      .catch(() => {})
  }, [])

  const {
    sprint, currentWeek,
    activeDay:     sprintActiveDay,
    setActiveDay:  setSprintDay,
    periodoCerrado,
    loading:       sprintLoading,
    fetchError,
    reload:        reloadSprint,
  } = useSprintContext()

  const dayKey  = state.activeDay    ?? sprintActiveDay
  const dateStr = state.activeDateStr
                  ?? currentWeek?.days?.find(d => d.key === dayKey)?.date
                  ?? null

  useEffect(() => {
    if (!state.activeDay && sprintActiveDay && currentWeek) {
      const today = currentWeek.days.find(d => d.isToday) ?? currentWeek.days[0]
      if (today) {
        dispatch({ type: 'SET_DAY', day: today.key, dateStr: today.date })
        entriesService.getOrCreateEntry(today.key, today.date)
          .then(entry => dispatch({ type: 'SYNC_ENTRY', dayKey: today.key, entry }))
          .catch(() => {})
      }
    }
  }, [sprintActiveDay, currentWeek, state.activeDay, dispatch])

  const handleSetDay = useCallback((key, date) => {
    dispatch({ type: 'SET_DAY', day: key, dateStr: date })
    setSprintDay(key)
    if (date) {
      entriesService.getOrCreateEntry(key, date)
        .then(entry => dispatch({ type: 'SYNC_ENTRY', dayKey: key, entry }))
        .catch(() => {})
    }
  }, [dispatch, setSprintDay])

  // true = backend confirmó que no hay sprint/periodo (no es error de red)
  const sinPeriodo    = !sprintLoading && !fetchError && (!sprint || periodoCerrado)
  // true = no pudimos contactar el servidor Y no tenemos sprint cacheado
  const unknownSprint = !sprintLoading && fetchError && !sprint

  const mensajeCierre = sinPeriodo
    ? (!sprint
        ? 'No hay sprint activo. Contacta al administrador para configurar uno.'
        : 'El período está cerrado. Los períodos se cierran automáticamente los domingos.')
    : null

  const entry    = dayKey ? (state.dayEntries[dayKey] ?? { status: 'borrador', tasks: [], habilitado: 0 }) : { status: 'borrador', tasks: [], habilitado: 0 }
  const { locked: _locked, editable: _editable, tag: _tag } = getEditState(entry)
  const locked   = sinPeriodo || unknownSprint || _locked
  const editable = !sinPeriodo && !unknownSprint && _editable
  const tag      = _tag
  const tasks    = entry.tasks ?? []
  const { total } = useCapacity(tasks)

  const activeDayInfo = currentWeek?.days?.find(d => d.key === dayKey)
  const festivo       = activeDayInfo ? isFestivo(activeDayInfo.date) : false
  const hasObsIssues  = tasks.some(t => t.dur > 240 && !t.desc?.trim())

  const catStats = useMemo(() => {
    const s = {}
    Object.values(CATS).forEach(cat => {
      const mins = tasks.filter(t => t.catId === cat.id).reduce((a, t) => a + (parseInt(t.dur) || 0), 0)
      if (mins > 0) s[cat.id] = { label: cat.label, color: cat.color, mins }
    })
    return s
  }, [tasks])

  const handleAddTask = useCallback(async (sub, cat) => {
    if (!dayKey || locked) return
    dispatch({ type: 'ADD_TASK_OPTIMISTIC', dayKey, sub, cat })
    if (dateStr) {
      try {
        const updatedEntry = await entriesService.addTask(dayKey, dateStr, {
          name: sub.label, model: sub.m, catId: cat.id, catLabel: cat.label, catColor: cat.color,
          subcategoriaId: sub.dbId ?? null, dur: 15, desc: '', projectId: null,
        })
        dispatch({ type: 'SYNC_ENTRY', dayKey, entry: updatedEntry })
      } catch (err) { console.warn('[MiDia] addTask:', err.message) }
    }
  }, [dayKey, dateStr, locked, dispatch])

  const handleUpdateTask = useCallback((id, field, value) => {
    if (!dayKey || locked) return
    dispatch({ type: 'UPDATE_TASK', dayKey, id, field, value })
    entriesService.updateTask(dayKey, id, field, value).catch(() => {})
  }, [dayKey, locked])

  const handleDeleteTask = useCallback((id) => {
    if (!dayKey || locked) return
    dispatch({ type: 'DELETE_TASK', dayKey, id })
    entriesService.deleteTask(dayKey, id).catch(() => {})
  }, [dayKey, locked])

  const handleSaveDraft = async () => {
    if (!tasks.length) { setModal('empty_draft'); return }
    setSaving(true)
    dispatch({ type: 'SAVE_DRAFT', dayKey })
    try {
      if (dateStr) {
        const updated = await entriesService.saveDraft(dayKey, dateStr)
        dispatch({ type: 'SYNC_ENTRY', dayKey, entry: updated })
      }
      setModal('draft')
    } catch { setModal('draft') }
    finally { setSaving(false) }
  }

  const handleFinalize = () => {
    if (!tasks.length) { setModal('empty'); return }
    if (hasObsIssues)  { setModal('obs_required'); return }
    const sinProyecto = tasks.filter(t => t.model === 'BUILD' && !t.projectId)
    if (sinProyecto.length) { setModal('missing_project'); return }
    setModal(tag === 'corrigiendo' ? 'confirm_correccion' : 'confirm')
  }

  const doFinalize = async () => {
    setSaving(true)
    dispatch({ type: 'FINALIZE_DAY', dayKey })
    try {
      if (dateStr) {
        const updated = await entriesService.finalizeEntry(dayKey, dateStr)
        dispatch({ type: 'SYNC_ENTRY', dayKey, entry: updated })
      }
      setModal(tag === 'corrigiendo' ? 'done_correccion' : 'done')
    } catch { setModal(null) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SprintBar sprint={sprint} currentWeek={currentWeek} periodoCerrado={periodoCerrado} />

      {/* ── Selector de día ── */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div className="mid-selector-hdr">
          <div>
            <div className="mid-title">Registro de actividades</div>
            <div className="mid-subtitle">
              {activeDayInfo
                ? <span>Registrando: <strong style={{ color: 'var(--c-accent)' }}>
                    {activeDayInfo.short} {activeDayInfo.num}{activeDayInfo.isToday ? ' · Hoy' : ''}
                  </strong></span>
                : 'Selecciona el día a registrar'
              }
            </div>
          </div>

          <div className="day-sel">
            {(currentWeek?.days ?? []).map(d => {
              const dayEntry   = state.dayEntries[d.key]
              const dayState   = dayEntry?.status
              const hasData    = !!(dayEntry?.tasks?.length)
              const isActive   = dayKey === d.key
              const esFestivo  = isFestivo(d.date)
              const isApproved = dayState === 'aprobado'
              const isSent     = ['enviado', 'finalizado'].includes(dayState)
              const isRejected = dayState === 'rechazado'
              return (
                <button key={d.key}
                  className={['day-btn', isActive ? 'active' : '', d.isToday && !isActive ? 'today-ring' : ''].join(' ')}
                  onClick={() => handleSetDay(d.key, d.date)}
                  title={isApproved ? 'Aprobado' : isSent ? 'Enviado' : isRejected ? 'Rechazado' : esFestivo ? 'Festivo Colombia' : ''}
                >
                  {d.isToday && !isActive && <span className="day-today-dot" />}
                  <span style={{ fontSize: 12 }}>{d.short}</span>
                  <span className="dn">{d.num}</span>
                  {isApproved && !isActive && (
                    <span className="mid-day-ind" style={{ fontSize: 8, color: '#30693B' }}>✓</span>
                  )}
                  {isSent && !isActive && !isApproved && (
                    <span className="mid-day-ind" style={{ width: 5, height: 5, borderRadius: '50%', background: '#3E5D9D', display: 'block' }} />
                  )}
                  {isRejected && !isActive && (
                    <span className="mid-day-ind" style={{ fontSize: 8, color: '#992C26' }}>✕</span>
                  )}
                  {!isApproved && !isSent && !isRejected && hasData && !isActive && (
                    <span className="mid-day-ind" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brand-orange)', display: 'block' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {unknownSprint && (
          <div className="mid-error-banner">
            <WifiOff size={14} style={{ flexShrink: 0 }} />
            <span>Error de conexión — no se pudo verificar el sprint</span>
            <button className="mid-retry-btn" onClick={() => reloadSprint()}>
              <RefreshCw size={12} /> Reintentar
            </button>
          </div>
        )}

        {mensajeCierre && (
          <div className="mid-closed-banner">
            <Lock size={14} style={{ flexShrink: 0 }} /> {mensajeCierre}
          </div>
        )}

        {festivo && (
          <div className="mid-festivo-banner">
            🇨🇴 Festivo en Colombia — puedes registrar actividades si aplica
          </div>
        )}

        {editable && <CapacityBar total={total} />}

        {editable && tasks.length > 0 && (
          <div className="mid-cat-stats">
            <span className="mid-cat-count">{tasks.length} act. ·</span>
            {Object.values(catStats).map(cs => (
              <div key={cs.label} className="mid-cat-pill"
                style={{ border: `1px solid ${cs.color}30`, background: `${cs.color}10` }}>
                <span className="mid-cat-dot" style={{ background: cs.color }} />
                <span className="mid-cat-label" style={{ color: cs.color }}>{cs.label.split(' ')[0]}</span>
                <span className="mid-cat-mins" style={{ color: cs.color }}>{cs.mins}m</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid principal ── */}
      <div className="mid-grid">
        {/* Panel izquierdo */}
        <div className="card mid-left-panel">
          {editable
            ? <ActivityPanel onAddOverride={handleAddTask} />
            : <div className="mid-locked-msg">
                <Lock size={24} style={{ color: 'var(--t-muted)', opacity: .5, margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: 12, color: 'var(--t-muted)' }}>
                  {tag === 'aprobado' ? 'Jornada aprobada' : 'Jornada enviada'}
                </div>
                {tag === 'rechazado' && (
                  <div className="mid-rejected-hint">Ve a Histórico para corregir</div>
                )}
              </div>
          }
        </div>

        {/* Panel derecho */}
        <div>
          <div className="jornada-title">
            <Calendar size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
            <div>
              <div className="jornada-title-day">
                Registro — {activeDayInfo ? `${activeDayInfo.short} ${activeDayInfo.num}` : '—'}
              </div>
              <div className="jornada-title-date">
                {activeDayInfo?.isToday ? '📍 Hoy' : activeDayInfo ? currentWeek?.dateRange : ''}
                {festivo ? ' · 🇨🇴 Festivo' : ''}
                {tag === 'aprobado'    ? ' · ✅ Aprobado'    : ''}
                {tag === 'enviado'     ? ' · 🔒 En revisión' : ''}
                {tag === 'corrigiendo' ? ' · ✏️ Corrigiendo' : ''}
                {tag === 'rechazado'   ? ' · ❌ Rechazado'   : ''}
                {tag === 'borrador' && tasks.length > 0 ? ' · En progreso' : ''}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, minHeight: 280 }}>
            <EstadoBanner tag={tag} />

            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-ico" style={{ opacity: .22 }}>
                  <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <p>{locked ? 'No se registraron actividades' : 'Selecciona actividades del panel izquierdo'}</p>
              </div>
            ) : (
              <div className="mid-task-list">
                <AnimatePresence mode="popLayout">
                  {tasks.map(t => (
                    <motion.div key={String(t.id)}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95, height: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                      <ActivityCard
                        task={t}
                        locked={locked}
                        proyectos={proyectos}
                        onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {editable && (
            <div className="mid-action-row">
              <Button className="btn-ghost" disabled={saving} onClick={handleSaveDraft}>
                <Folder size={12} /> {saving ? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button className="btn-primary" disabled={saving} onClick={handleFinalize}>
                <CheckCircle size={12} />
                {tag === 'corrigiendo' ? 'Reenviar corrección' : 'Finalizar día'}
              </Button>
            </div>
          )}

          {locked && tag !== 'rechazado' && (
            <div className="mid-status-row">
              <div className="mid-status-badge" style={{
                background:   tag === 'aprobado' ? 'rgba(48,105,59,0.09)'  : 'rgba(62,93,157,0.09)',
                color:        tag === 'aprobado' ? '#30693B'                : '#3E5D9D',
                borderColor:  tag === 'aprobado' ? 'rgba(48,105,59,0.25)'  : 'rgba(62,93,157,0.25)',
              }}>
                {tag === 'aprobado'
                  ? <><CheckCircle size={13}/> Jornada aprobada</>
                  : <><Lock size={13}/> Pendiente de aprobación</>
                }
              </div>
            </div>
          )}

          {tag === 'rechazado' && !entry.habilitado && (
            <div className="mid-rejected-box">
              <div className="mid-rejected-ttl">❌ Jornada rechazada</div>
              <div className="mid-rejected-body">
                Ve al módulo <strong>Histórico</strong> para ver el motivo y corregir la actividad.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modales ── */}
      <Modal open={modal === 'empty_draft'} onClose={() => setModal(null)} iconCls="mi-w" icon={<AlertCircle size={26}/>}
        title="Sin actividades" desc="Agrega al menos una actividad antes de guardar."
        actions={<Button className="btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido</Button>}/>
      <Modal open={modal === 'draft'} onClose={() => setModal(null)} iconCls="mi-w" icon={<Folder size={26}/>}
        title="Borrador guardado" desc="Tus actividades están guardadas. Puedes seguir editando."
        actions={<Button className="btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido</Button>}/>
      <Modal open={modal === 'obs_required'} onClose={() => setModal(null)} iconCls="mi-w" icon={<AlertCircle size={26}/>}
        title="Observación requerida" desc="Tienes actividades de más de 240 minutos sin descripción."
        actions={<Button className="btn-warn" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido</Button>}/>
      <Modal open={modal === 'empty'} onClose={() => setModal(null)} iconCls="mi-w" icon={<AlertCircle size={26}/>}
        title="Sin actividades" desc="Registra al menos una actividad antes de finalizar."
        actions={<Button className="btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido</Button>}/>
      <Modal open={modal === 'confirm'} onClose={() => setModal(null)} iconCls="mi-i" icon={<AlertCircle size={26}/>}
        title="¿Finalizar la jornada?"
        desc={`Se enviarán ${tasks.length} actividades · ${minsToH(total)} para aprobación del jefe. No podrás editar hasta que se complete la revisión.`}
        actions={<>
          <Button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Cancelar</Button>
          <Button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving} onClick={doFinalize}>
            {saving ? 'Finalizando...' : 'Confirmar'}
          </Button>
        </>}/>
      <Modal open={modal === 'confirm_correccion'} onClose={() => setModal(null)} iconCls="mi-i" icon={<Edit3 size={26}/>}
        title="¿Reenviar corrección?"
        desc="Se enviará la jornada corregida al jefe para una nueva revisión."
        actions={<>
          <Button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Cancelar</Button>
          <Button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving} onClick={doFinalize}>
            {saving ? 'Enviando...' : 'Reenviar'}
          </Button>
        </>}/>
      <Modal open={modal === 'done'} onClose={() => setModal(null)} iconCls="mi-s" icon="🎉"
        title="¡Jornada finalizada!" desc="Tu registro fue enviado al jefe directo para aprobación."
        actions={<Button className="btn-success" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Perfecto</Button>}/>
      <Modal open={modal === 'done_correccion'} onClose={() => setModal(null)} iconCls="mi-s" icon="✅"
        title="Corrección enviada" desc="Tu jornada corregida fue enviada nuevamente al jefe para aprobación."
        actions={<Button className="btn-success" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Listo</Button>}/>
      <Modal open={modal === 'missing_project'} onClose={() => setModal(null)} iconCls="mi-w" icon={<AlertCircle size={26}/>}
        title="Proyecto requerido"
        desc="Tienes actividades de tipo BUILD/Proyectos sin seleccionar el proyecto. Por favor indica en qué proyecto trabajaste antes de finalizar."
        actions={<Button className="btn-warn" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido, voy a seleccionarlo</Button>}/>
    </div>
  )
}
