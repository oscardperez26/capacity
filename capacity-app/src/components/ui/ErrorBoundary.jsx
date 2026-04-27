/**
 * ErrorBoundary.jsx
 * Captura errores de renderizado en el árbol de componentes.
 * Muestra un fallback amigable en lugar de romper la app.
 */

import { Component } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo)
    this.setState({ errorInfo })
    // TODO Fase 4: enviar a servicio de logging (Sentry, etc.)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { fallback, moduleName = 'este módulo' } = this.props

    if (fallback) return fallback

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', gap: 12,
        border: '2px dashed var(--c-danger-bg)',
        borderRadius: 16, margin: '16px 0',
        background: 'var(--c-danger-bg)',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={24} style={{ color: 'var(--c-danger2)' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-danger2)', marginBottom: 6 }}>
            Error en {moduleName}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--t-secondary)', maxWidth: 340, lineHeight: 1.6 }}>
            Ocurrió un error inesperado. Puedes intentar recargar el módulo o contactar al administrador si el problema persiste.
          </p>
          {this.state.error && (
            <code style={{ display: 'block', marginTop: 8, fontSize: 9, color: 'var(--t-muted)', background: 'var(--c-surface2)', padding: '4px 8px', borderRadius: 6 }}>
              {this.state.error.message}
            </code>
          )}
        </div>

        <button
          onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 9,
            background: 'var(--c-danger2)', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          }}
        >
          <RefreshCw size={12} /> Reintentar
        </button>
      </div>
    )
  }
}

/** HOC conveniente para envolver un componente con su propio boundary */
export function withErrorBoundary(Component, moduleName) {
  return function WrappedWithBoundary(props) {
    return (
      <ErrorBoundary moduleName={moduleName}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
