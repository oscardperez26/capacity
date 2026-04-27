/**
 * Spinner.jsx
 * Indicador de carga animado con CSS.
 * Se usa en estados loading de módulos y botones.
 */

export default function Spinner({ size = 20, color = 'var(--c-accent)', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite', ...style }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="12" cy="12" r="10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40 60"
      />
    </svg>
  )
}

/** Overlay de carga de página completa */
export function PageLoader({ message = 'Cargando...' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--c-bg)', gap: 14,
    }}>
      <Spinner size={36} />
      <span style={{ fontSize: 12, color: 'var(--t-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
        {message}
      </span>
    </div>
  )
}

/** Spinner inline dentro de botones */
export function ButtonSpinner() {
  return <Spinner size={13} color="currentColor" />
}
