import './DaySelector.css'
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
        const hasData     = !!(dayEntries[d.key]?.tasks?.length)
        const isActive    = activeDay === d.key
        const festivo     = isFestivo(d.date)

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
            style={{ opacity: isFinalized ? 0.4 : 1 }}
            title={festivo ? '🇨🇴 Día festivo Colombia' : undefined}
          >
            {d.isToday && !isActive && <span className="day-today-dot" />}
            <span>{d.short}</span>
            <span className="dn">{d.num}</span>

            {festivo && !isActive && (
              <span className="ds-indicator ds-festivo-co">CO</span>
            )}

            {!festivo && isFinalized && (
              <span className="ds-indicator ds-done-check"
                style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'var(--c-success)' }}>✓</span>
            )}

            {!festivo && !isFinalized && hasData && (
              <span className="ds-indicator ds-data-dot"
                style={{ background: isActive ? 'rgba(255,255,255,0.7)' : 'var(--brand-orange)' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
