/**
 * LoginPage.jsx — Fase 3
 * Usa useForm + validators + authService.
 * La lógica de submit ya no vive en el componente.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useForm } from '../../hooks/useForm'
import { validateLogin, validateRecover } from '../../lib/validators'
import { FormField, PasswordField } from '../../components/ui/FormField'
import { ButtonSpinner } from '../../components/ui/Spinner'

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
              style={{ width: 18, borderRadius: '5px 5px 0 0', background: i === 3 ? '#D65830' : i === 7 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)', boxShadow: i === 3 ? '0 0 18px rgba(214,88,48,0.5)' : '' }}
            />
          ))}
        </div>
        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, letterSpacing: -.4, marginBottom: 7 }}>Gestión de Capacidad</h2>
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

// ── Login form ──────────────────────────────────────────────────────────────
function LoginForm({ onForgot }) {
  const { login } = useAuth()
  const [showP, setShowP] = useState(false)
  const [apiError, setApiError] = useState('')

  const { values, errors, touched, isSubmitting, register, handleSubmit, handleBlur, setValue } = useForm({
    initialValues: { email: '', password: '' },
    validate: validateLogin,
    onSubmit: async ({ email, password }) => {
      setApiError('')
      const result = await login(email, password)
      if (!result.success) setApiError(result.error ?? 'Error al iniciar sesión')
    },
  })

  const fillDemo = (email) => { setValue('email', email); setValue('password', 'demo1234') }

  return (
    <motion.div className="login-panel" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#33289A,#4554A1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: 'white' }}>C</div>
        <div style={{ width: 1, height: 20, background: 'var(--c-border2)', margin: '0 4px' }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -.2, color: 'var(--c-accent)' }}>Capacity</div>
          <div style={{ fontSize: 7.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.8, color: 'var(--t-muted)' }}>Gestión de carga laboral</div>
        </div>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -.4, marginBottom: 3 }}>Bienvenido de nuevo</h1>
      <p style={{ fontSize: 11.5, color: 'var(--t-muted)', marginBottom: 24 }}>Ingresa con tu cuenta corporativa Permoda</p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="Correo corporativo"
          name="email"
          type="email"
          placeholder="usuario@permoda.com.co"
          error={errors.email}
          touched={touched.email}
          required
          {...register('email')}
        />

        <PasswordField
          label="Contraseña"
          name="password"
          placeholder="••••••••"
          showPassword={showP}
          onToggle={() => setShowP(p => !p)}
          error={errors.password}
          touched={touched.password}
          {...register('password')}
        />

        {apiError && (
          <p className="form-err">{apiError}</p>
        )}

        <button type="submit" className="login-submit" disabled={isSubmitting}>
          {isSubmitting ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><ButtonSpinner /> Verificando...</span> : 'Ingresar al sistema'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 12, fontSize: 10.5, color: 'var(--t-muted)' }}>
        <button type="button" onClick={onForgot} style={{ color: 'var(--c-accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
          ¿Olvidaste tu contraseña?
        </button>
      </p>

      <div style={{ height: 1, background: 'var(--c-border)', margin: '14px 0' }} />

      <div className="demo-box">
        <div className="demo-lbl">Acceso rápido (demo)</div>
        {[
          ['especialista@permoda.com.co', 'Especialista TI'],
          ['jefe@permoda.com.co', 'Jefe Directo'],
          ['admin@permoda.com.co', 'Administrador PMO'],
        ].map(([em, lbl]) => (
          <button key={em} className="demo-btn" onClick={() => fillDemo(em)}>
            <strong style={{ color: 'var(--c-accent)' }}>{lbl}</strong> — {em}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ── Recover form ────────────────────────────────────────────────────────────
function RecoverForm({ onBack, onSent }) {
  const { recoverPassword } = useAuth()

  const { values, errors, touched, isSubmitting, register, handleSubmit } = useForm({
    initialValues: { email: '' },
    validate: validateRecover,
    onSubmit: async ({ email }) => {
      await recoverPassword(email)
      onSent(email)
    },
  })

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
          <FormField
            label="Correo corporativo"
            name="email"
            type="email"
            placeholder="usuario@permoda.com.co"
            error={errors.email}
            touched={touched.email}
            required
            {...register('email')}
          />
          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Root ────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [step, setStep] = useState('login')
  const [sentTo, setSentTo] = useState('')

  if (step === 'forgot') return (
    <div className="login-screen">
      <RecoverForm onBack={() => setStep('login')} onSent={(email) => { setSentTo(email); setStep('sent') }} />
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
          <button className="login-submit" style={{ maxWidth: 280 }} onClick={() => setStep('login')}>
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
