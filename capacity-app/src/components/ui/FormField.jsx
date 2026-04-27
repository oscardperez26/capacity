/**
 * FormField.jsx
 * Campo de formulario con label, input/select/textarea y mensaje de error.
 * Integra directamente con useForm via el helper register().
 */

import { forwardRef } from 'react'

export const FormField = forwardRef(({
  label,
  name,
  error,
  touched,
  type = 'text',
  className = '',
  containerStyle,
  hint,
  required,
  children, // para selects con <option>
  ...props
}, ref) => {
  const showError = error && touched
  const inputCls = `form-inp ${showError ? 'err' : ''} ${className}`

  return (
    <div className="form-grp" style={containerStyle}>
      {label && (
        <label className="form-lbl" htmlFor={name}>
          {label}
          {required && <span style={{ color: 'var(--c-danger2)', marginLeft: 3 }}>*</span>}
        </label>
      )}

      {type === 'textarea' ? (
        <textarea
          ref={ref}
          id={name}
          name={name}
          className={inputCls}
          {...props}
        />
      ) : type === 'select' ? (
        <select
          ref={ref}
          id={name}
          name={name}
          className={inputCls}
          {...props}
        >
          {children}
        </select>
      ) : (
        <input
          ref={ref}
          id={name}
          name={name}
          type={type}
          className={inputCls}
          {...props}
        />
      )}

      {hint && !showError && (
        <span style={{ fontSize: 9, color: 'var(--t-muted)', marginTop: 4, display: 'block' }}>
          {hint}
        </span>
      )}

      {showError && (
        <span style={{
          fontSize: 9, color: 'var(--c-danger2)', fontWeight: 700,
          marginTop: 4, display: 'block', animation: 'shake .3s ease',
        }}>
          {error}
        </span>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'

/** Campo de contraseña con toggle de visibilidad */
export function PasswordField({ label, name, error, touched, showPassword, onToggle, ...props }) {
  const showError = error && touched
  return (
    <div className="form-grp">
      {label && <label className="form-lbl" htmlFor={name}>{label} <span style={{ color: 'var(--c-danger2)' }}>*</span></label>}
      <div className="inp-wrap">
        <input
          id={name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          className={`form-inp ${showError ? 'err' : ''}`}
          {...props}
        />
        <button
          type="button"
          className="eye-btn-login"
          onClick={onToggle}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {showPassword
            ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
      {showError && (
        <span style={{ fontSize: 9, color: 'var(--c-danger2)', fontWeight: 700, marginTop: 4, display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  )
}
