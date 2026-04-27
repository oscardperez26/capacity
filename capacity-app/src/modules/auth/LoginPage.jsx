/**
 * LoginPage.jsx — Fase 4 (corregido)
 * Login directo contra la API sin doble validación.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// ── Arte lateral ────────────────────────────────────────────────────────────
function ArtBg() {
  return (
    <div className="login-art">
      <div className="art-blob" style={{ width: 380, height: 380, top: '-20%', right: '-10%', background: 'rgba(51,40,154,0.30)' }} />
      <div className="art-blob" style={{ width: 260, height: 260, bottom: '-10%', left: '-8%', background: 'rgba(214,88,48,0.28)' }} />
      <div className="art-blob" style={{ width: 180, height: 180, top: '42%', left: '28%', background: 'rgba(48,105,59,0.20)' }} />
      <div className="login-art-content">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, justifyContent: 'center', height: 90, marginBottom: 22 }}>
          {[0.38, 0.62, 0.50, 1, 0.70, 0.88, 0.42, 0.78].map((h, i) => (
            <motion.div key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h * 100}%` }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                width: 18, borderRadius: '5px 5px 0 0',
                background: i === 3 ? '#D65830' : i === 7 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                boxShadow: i === 3 ? '0 0 18px rgba(214,88,48,0.5)' : '',
              }}
            />
          ))}
        </div>
        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, letterSpacing: -.4, marginBottom: 7 }}>
          Gestión de Capacidad
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5, lineHeight: 1.7, maxWidth: 270 }}>
          Plataforma ITIL 4 para análisis y control operativo del área de Tecnología Permoda.
        </p>
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          {['RUN', 'BUILD', 'ADMIN', 'GROW', 'OFF'].map(m => (
            <span key={m} style={{ padding: '3px 9px', borderRadius: 99, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 8.5, fontWeight: 700, letterSpacing: .9 }}>{m}</span>
          ))}
        </div>
      </div>
      <div className="dev-credit">Desarrollado por Aplicaciones Permoda · v1.0</div>
    </div>
  )
}

// ── Login principal ─────────────────────────────────────────────────────────
function LoginForm({ onForgot }) {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones básicas en cliente
    if (!email.trim())    { setError('El correo es obligatorio');    return }
    if (!password.trim()) { setError('La contraseña es obligatoria'); return }
    if (!email.endsWith('@permoda.com.co')) {
      setError('Usa tu correo @permoda.com.co')
      return
    }

    setLoading(true)
    try {
      const result = await login(email.trim(), password)
      if (!result || !result.success) {
        setError(result?.error ?? 'Credenciales inválidas')
      }
      // Si success=true, AuthContext ya actualizó el user y App redirige
    } catch (err) {
      console.error('Login error:', err)
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail)
    setPassword('demo1234')
    setError('')
  }

  return (
    <motion.div
      className="login-panel"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#33289A,#4554A1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: 'white' }}>C</div>
        <div style={{ width: 1, height: 20, background: 'var(--c-border2)', margin: '0 4px' }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -.2, color: 'var(--c-accent)' }}>Capacity</div>
          <div style={{ fontSize: 7.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.8, color: 'var(--t-muted)' }}>
            Gestión de carga laboral
          </div>
        </div>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -.4, marginBottom: 3 }}>Bienvenido de nuevo</h1>
      <p style={{ fontSize: 11.5, color: 'var(--t-muted)', marginBottom: 24 }}>
        Ingresa con tu cuenta corporativa Permoda
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="form-grp">
          <label className="form-lbl">Correo corporativo *</label>
          <input
            className="form-inp"
            type="email"
            placeholder="usuario@permoda.com.co"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
        </div>

        {/* Password */}
        <div className="form-grp">
          <label className="form-lbl">Contraseña *</label>
          <div className="inp-wrap">
            <input
              className="form-inp"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              className="eye-btn-login"
              onClick={() => setShowPass(p => !p)}
              tabIndex={-1}
            >
              {showPass
                ? <EyeOff size={15} />
                : <Eye    size={15} />
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="form-err">{error}</p>
        )}

        {/* Submit */}
        <button type="submit" className="login-submit" disabled={loading}>
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="40 60"/>
                </svg>
                Verificando...
              </span>
            : 'Ingresar al sistema'
          }
        </button>
      </form>

      {/* Forgot */}
      <p style={{ textAlign: 'center', marginTop: 12, fontSize: 10.5, color: 'var(--t-muted)' }}>
        <button
          type="button"
          onClick={onForgot}
          style={{ color: 'var(--c-accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>


    </motion.div>
  )
}

// ── Recover ─────────────────────────────────────────────────────────────────
function RecoverForm({ onBack, onSent }) {
  const { recoverPassword } = useAuth()
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('El correo es obligatorio'); return }
    if (!email.endsWith('@permoda.com.co')) { setError('Correo debe ser @permoda.com.co'); return }
    setError(''); setLoading(true)
    try {
      await recoverPassword(email.trim())
      onSent(email.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-panel">
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--t-muted)', fontSize: 10.5, fontWeight: 700, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: .4 }}>
        <ArrowLeft size={13} /> Volver al inicio
      </button>
      <div className="recover-wrap">
        <div style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--c-accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Mail size={24} style={{ color: 'var(--c-accent)' }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: -.4, marginBottom: 6 }}>Recuperar contraseña</h2>
        <p style={{ fontSize: 11.5, color: 'var(--t-secondary)', marginBottom: 20, lineHeight: 1.7 }}>
          Ingresa tu correo corporativo para recibir instrucciones.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grp">
            <label className="form-lbl">Correo corporativo</label>
            <input className={`form-inp ${error ? 'err' : ''}`} type="email" placeholder="usuario@permoda.com.co" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {error && <p className="form-err">{error}</p>}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar instrucciones'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Root ────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [step,   setStep]   = useState('login')
  const [sentTo, setSentTo] = useState('')

  if (step === 'forgot') return (
    <div className="login-screen">
      <RecoverForm onBack={() => setStep('login')} onSent={(em) => { setSentTo(em); setStep('sent') }} />
      <ArtBg />
    </div>
  )

  if (step === 'sent') return (
    <div className="login-screen">
      <div className="login-panel" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="recover-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 55, marginBottom: 14 }}>✉️</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 7 }}>¡Correo enviado!</h2>
          <p style={{ fontSize: 11.5, color: 'var(--t-secondary)', lineHeight: 1.7, maxWidth: 260, marginBottom: 22 }}>
            Enviamos instrucciones a <strong style={{ color: 'var(--c-accent)' }}>{sentTo}</strong>.
          </p>
          <button className="login-submit" style={{ maxWidth: 280 }} onClick={() => { setStep('login'); setSentTo('') }}>
            Volver al inicio de sesión
          </button>
        </div>
      </div>
      <ArtBg />
    </div>
  )

  return (
    <div className="login-screen">
      <LoginForm onForgot={() => setStep('forgot')} />
      <ArtBg />
    </div>
  )
}
