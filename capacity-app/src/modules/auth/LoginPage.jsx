import './LoginPage.css'
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
        <div className="lp-art-bars">
          {[0.38, 0.62, 0.50, 1, 0.70, 0.88, 0.42, 0.78].map((h, i) => (
            <motion.div key={i}
              className="lp-art-bar"
              initial={{ height: 0 }}
              animate={{ height: `${h * 100}%` }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                background: i === 3 ? '#D65830' : i === 7 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                boxShadow: i === 3 ? '0 0 18px rgba(214,88,48,0.5)' : '',
              }}
            />
          ))}
        </div>
        <h2 className="lp-art-title">Gestión de Capacidad</h2>
        <p className="lp-art-desc">
          Plataforma ITIL 4 para análisis y control operativo del área de Tecnología Permoda.
        </p>
        <div className="lp-art-models">
          {['RUN', 'BUILD', 'ADMIN', 'GROW', 'OFF'].map(m => (
            <span key={m} className="lp-model-tag">{m}</span>
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
    } catch (err) {
      console.error('Login error:', err)
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="login-panel"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Logo */}
      <div className="lp-logo">
        <div className="lp-logo-icon">C</div>
        <div className="lp-logo-div" />
        <div>
          <div className="lp-logo-name">Capacity</div>
          <div className="lp-logo-sub">Gestión de carga laboral</div>
        </div>
      </div>

      <h1 className="lp-title">Bienvenido de nuevo</h1>
      <p className="lp-subtitle">Ingresa con tu cuenta corporativa Permoda</p>

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
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && <p className="form-err">{error}</p>}

        <button type="submit" className="login-submit" disabled={loading}>
          {loading
            ? <span className="lp-spinner">
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

      <p className="lp-forgot">
        <button type="button" className="lp-forgot-btn" onClick={onForgot}>
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
      <button onClick={onBack} className="lp-back-btn">
        <ArrowLeft size={13} /> Volver al inicio
      </button>
      <div className="recover-wrap">
        <div className="lp-recover-icon">
          <Mail size={24} style={{ color: 'var(--c-accent)' }} />
        </div>
        <h2 className="lp-recover-title">Recuperar contraseña</h2>
        <p className="lp-recover-desc">
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
      <div className="login-panel lp-sent-panel">
        <div className="recover-wrap lp-sent-recover">
          <div className="lp-sent-emoji">✉️</div>
          <h2 className="lp-sent-title">¡Correo enviado!</h2>
          <p className="lp-sent-desc">
            Enviamos instrucciones a <strong style={{ color: 'var(--c-accent)' }}>{sentTo}</strong>.
          </p>
          <button className="login-submit lp-sent-submit" onClick={() => { setStep('login'); setSentTo('') }}>
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
