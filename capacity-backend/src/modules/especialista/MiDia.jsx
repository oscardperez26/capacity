import { useState, useMemo } from 'react'
import { Clock, Calendar, Folder, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../context/StoreContext'
import { useCapacity } from '../../hooks/useCapacity'
import { SPRINT_ACTIVO, CURRENT_WEEK } from '../../data/mockData'
import { isFestivo, CATS } from '../../data/categories'
import { minsToH } from '../../utils/capacityUtils'
import ProgressBar from '../../components/ui/ProgressBar'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import ActivityCard from './ActivityCard'
import ActivityPanel from './ActivityPanel'
import DaySelector from './DaySelector'

export default function MiDia({ user }) {
  const { state, dispatch } = useStore()
  const [modal, setModal] = useState(null)
  const area = user?.area ?? 'infraestructura'

  const dayKey = state.activeDay
  const entry = state.dayEntries[dayKey] ?? { status: 'borrador', tasks: [] }
  const locked = entry.status === 'finalizado'
  const tasks = entry.tasks ?? []
  const { total, pct } = useCapacity(tasks)
  const activeDayInfo = CURRENT_WEEK.days.find(d => d.key === dayKey)
  const hasObsIssues = tasks.some(t => t.dur > 240 && !t.desc?.trim())

  // Category breakdown
  const catStats = useMemo(() => {
    const stats = {}
    Object.values(CATS).forEach(cat => {
      const mins = tasks.filter(t => t.catId === cat.id).reduce((a, t) => a + (parseInt(t.dur) || 0), 0)
      if (mins > 0) stats[cat.id] = { label: cat.label, color: cat.color, mins }
    })
    return stats
  }, [tasks])

  const handleFinalize = () => {
    if (tasks.length === 0) { setModal('empty'); return }
    if (hasObsIssues) { setModal('obs_required'); return }
    setModal('confirm')
  }

  const doFinalize = () => {
    dispatch({ type: 'FINALIZE_DAY' })
    dispatch({ type: 'ADD_AUDIT', action: `Jornada finalizada — ${activeDayInfo?.short} ${activeDayInfo?.num}`, user: user?.name })
    setModal('done')
  }

  const festivo = activeDayInfo ? isFestivo(activeDayInfo.date) : false

  return (
    <div>
      {/* Sprint Bar */}
      <div className="sprint-bar">
        <span className="sprint-pill">Sprint {SPRINT_ACTIVO.id}</span>
        <span className="sprint-dates">{CURRENT_WEEK.label} · {CURRENT_WEEK.dateRange}</span>
        <div className="sprint-warn">
          <Clock size={11} /> {SPRINT_ACTIVO.daysLeft} días para cierre
        </div>
      </div>

      {/* Day card */}
      <div className="card p20 mb-14" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: -.3 }}>Mi Jornada</div>
            <div style={{ fontSize: 10, color: 'var(--t-muted)', marginTop: 3 }}>Selecciona el día a registrar</div>
          </div>
          <DaySelector />
        </div>

        {/* Festivo banner */}
        {festivo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(153,44,38,0.07)', border: '1px solid rgba(153,44,38,0.2)', borderRadius: 8, marginBottom: 10, fontSize: 10.5, fontWeight: 600, color: 'var(--brand-red)' }}>
            🇨🇴 Este día es <strong>festivo en Colombia</strong>. Puedes registrar actividades si aplica.
          </div>
        )}

        {!locked && <ProgressBar pct={pct} />}

        {/* Category breakdown */}
        {!locked && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .9, color: 'var(--t-muted)', flexShrink: 0 }}>
              {tasks.length} act. ·
            </span>
            <span style={{
              fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .9,
              color: total > 480 ? 'var(--brand-red)' : total > 384 ? 'var(--brand-orange)' : 'var(--brand-green)',
              flexShrink: 0, fontFamily: 'JetBrains Mono, monospace',
            }}>
              {total}/480 min
            </span>
            {Object.values(catStats).map(cs => (
              <div key={cs.label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, border: `1px solid ${cs.color}30`, background: `${cs.color}10` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cs.color, flexShrink: 0 }} />
                <span style={{ fontSize: 8.5, fontWeight: 700, color: cs.color, whiteSpace: 'nowrap' }}>{cs.label.split(' ')[0]}</span>
                <span style={{ fontSize: 8.5, fontWeight: 900, color: cs.color, fontFamily: 'JetBrains Mono, monospace' }}>{cs.mins}m</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 12 }}>
        {/* Left: category panel */}
        <div className="card" style={{ padding: 20, alignSelf: 'start', position: 'sticky', top: 8 }}>
          <ActivityPanel />
          {locked && (
            <div style={{ marginTop: 12, padding: '9px 12px', background: 'var(--c-accent3)', borderRadius: 8, border: '1px solid rgba(51,40,154,0.18)', fontSize: 10.5, fontWeight: 600, color: 'var(--c-accent)', textAlign: 'center' }}>
              🔒 Jornada finalizada — solo lectura
            </div>
          )}
        </div>

        {/* Right: activities */}
        <div>
          <div className="jornada-title">
            <Calendar size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
            <div>
              <div className="jornada-title-day">
                Mi Jornada — {activeDayInfo ? `${activeDayInfo.short} ${activeDayInfo.num} Feb 2025` : 'Selecciona un día'}
              </div>
              <div className="jornada-title-date">
                {activeDayInfo?.isToday ? '📍 Hoy' : CURRENT_WEEK.dateRange}
                {festivo ? ' · 🇨🇴 Festivo' : ''}
                {locked ? ' · ✓ Finalizado' : ' · En progreso'}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, minHeight: 280 }}>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-ico" style={{ opacity: .22 }}>
                  <svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <p>{locked ? 'No se registraron actividades este día' : 'Selecciona actividades del panel izquierdo'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AnimatePresence>
                  {tasks.map(t => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                      <ActivityCard
                        task={t}
                        locked={locked}
                        area={area}
                        onUpdate={(id, f, v) => dispatch({ type: 'UPDATE_TASK', id, field: f, value: v })}
                        onDelete={id => dispatch({ type: 'DELETE_TASK', id })}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {!locked && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'flex-end' }}>
              <Button className="btn-ghost" onClick={() => { dispatch({ type: 'SAVE_DRAFT' }); setModal('draft') }}>
                <Folder size={12} /> Guardar borrador
              </Button>
              <Button className="btn-primary" onClick={handleFinalize}>
                <CheckCircle size={12} /> Finalizar día
              </Button>
            </div>
          )}

          {locked && (
            <div style={{ display: 'flex', marginTop: 12, justifyContent: 'flex-end' }}>
              <div style={{ padding: '8px 14px', background: 'var(--c-success-bg)', borderRadius: 10, border: '1px solid rgba(48,105,59,0.2)', fontSize: 11.5, fontWeight: 700, color: 'var(--c-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={13} /> Jornada enviada — pendiente de aprobación
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={modal === 'draft'} onClose={() => setModal(null)} iconCls="mi-w" icon={<Folder size={26} />}
        title="Borrador guardado" desc="Tu progreso fue almacenado."
        actions={<Button className="btn-primary w-full" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido</Button>} />

      <Modal open={modal === 'obs_required'} onClose={() => setModal(null)} iconCls="mi-w" icon={<AlertCircle size={26} />}
        title="Observación requerida"
        desc="Tienes actividades > 240 minutos. Es obligatorio agregar una observación antes de finalizar."
        actions={<Button className="btn-warn w-full" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido</Button>} />

      <Modal open={modal === 'confirm'} onClose={() => setModal(null)} iconCls="mi-i" icon={<AlertCircle size={26} />}
        title="¿Finalizar la jornada?"
        desc={`Se registrarán ${tasks.length} actividades · ${minsToH(total)} horas (${Math.round(pct)}%). Esta acción bloqueará la edición.`}
        actions={<>
          <Button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Cancelar</Button>
          <Button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={doFinalize}>Confirmar</Button>
        </>} />

      <Modal open={modal === 'done'} onClose={() => setModal(null)} iconCls="mi-s" icon="🎉"
        title="¡Jornada finalizada!" desc="Tu registro fue enviado al jefe directo para revisión y aprobación."
        actions={<Button className="btn-success" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Perfecto</Button>} />

      <Modal open={modal === 'empty'} onClose={() => setModal(null)} iconCls="mi-w" icon={<AlertCircle size={26} />}
        title="Sin actividades" desc="Debes registrar al menos una actividad antes de finalizar la jornada."
        actions={<Button className="btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={() => setModal(null)}>Entendido</Button>} />
    </div>
  )
}
