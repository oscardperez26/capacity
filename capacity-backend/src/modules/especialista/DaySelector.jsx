import { useStore } from '../../context/StoreContext'
import { isFestivo } from '../../data/categories'
import { CURRENT_WEEK } from '../../data/mockData'

export default function DaySelector() {
  const { state, dispatch } = useStore()
  const { activeDay, dayEntries } = state

  return (
    <div className="day-sel">
      {CURRENT_WEEK.days.map(d => {
        const isFinalized = dayEntries[d.key]?.status === 'finalizado'
        const hasData = !!(dayEntries[d.key]?.tasks?.length)
        const isActive = activeDay === d.key
        const festivo = isFestivo(d.date)

        return (
          <button
            key={d.key}
            className={[
              'day-btn',
              isActive ? 'active' : '',
              d.isToday && !isActive ? 'today-ring' : '',
              isFinalized ? 'done-day' : '',
              festivo && !isActive ? 'festivo-day' : '',
            ].join(' ')}
            onClick={() => dispatch({ type: 'SET_DAY', day: d.key })}
            style={{ position: 'relative', opacity: isFinalized ? 0.4 : 1 }}
            title={festivo ? '🇨🇴 Día festivo Colombia' : undefined}
          >
            {d.isToday && !isActive && <span className="day-today-dot" />}
            <span>{d.short}</span>
            <span className="dn">{d.num}</span>

            {/* Festivo marker */}
            {festivo && !isActive && (
              <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', fontSize: 6, color: 'var(--brand-red)', fontWeight: 900 }}>CO</span>
            )}

            {/* Finalized check */}
            {!festivo && isFinalized && (
              <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--c-success)' }}>✓</span>
            )}

            {/* Has data dot */}
            {!festivo && !isFinalized && hasData && (
              <span style={{
                position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%',
                background: isActive ? 'rgba(255,255,255,0.7)' : 'var(--brand-orange)',
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
