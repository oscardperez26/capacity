/**
 * CambiarPassword.jsx
 * Layout idéntico al login: login-screen → login-panel (izq) + ArtBg (der)
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, CheckCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import { api } from '../../lib/apiClient'

// ── Arte lateral — copia exacta de LoginPage ─────────────────────────────
function ArtBg() {
  return (
    <div className="login-art">
      <div className="art-blob" style={{ width:380, height:380, top:'-20%', right:'-10%', background:'rgba(51,40,154,0.30)' }}/>
      <div className="art-blob" style={{ width:260, height:260, bottom:'-10%', left:'-8%', background:'rgba(214,88,48,0.28)' }}/>
      <div className="art-blob" style={{ width:180, height:180, top:'42%', left:'28%', background:'rgba(48,105,59,0.20)' }}/>
      <div className="login-art-content">
        <div style={{ display:'flex', alignItems:'flex-end', gap:6, justifyContent:'center', height:90, marginBottom:22 }}>
          {[0.38,0.62,0.50,1,0.70,0.88,0.42,0.78].map((h,i) => (
            <motion.div key={i}
              initial={{ height:0 }}
              animate={{ height:`${h*100}%` }}
              transition={{ delay:i*0.08, duration:0.7, ease:[0.34,1.56,0.64,1] }}
              style={{
                width:18, borderRadius:'5px 5px 0 0',
                background: i===3?'#D65830':i===7?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.15)',
                boxShadow: i===3?'0 0 18px rgba(214,88,48,0.5)':'',
              }}
            />
          ))}
        </div>
        <h2 style={{ color:'white', fontSize:22, fontWeight:900, letterSpacing:-.4, marginBottom:7 }}>
          Gestión de Capacidad
        </h2>
        <p style={{ color:'rgba(255,255,255,0.55)', fontSize:11.5, lineHeight:1.7, maxWidth:270 }}>
          Plataforma ITIL 4 para análisis y control operativo del área de Tecnología Permoda.
        </p>
        <div style={{ display:'flex', gap:7, justifyContent:'center', marginTop:20, flexWrap:'wrap' }}>
          {['RUN','BUILD','ADMIN','GROW','OFF'].map(m => (
            <span key={m} style={{ padding:'3px 9px', borderRadius:99, background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)', fontSize:8.5, fontWeight:700, letterSpacing:.9 }}>{m}</span>
          ))}
        </div>
      </div>
      <div className="dev-credit">Desarrollado por Aplicaciones Permoda · v1.0</div>
    </div>
  )
}

// ── Regla de validación ──────────────────────────────────────────────────
function Regla({ ok, texto }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
      <div style={{
        width:16, height:16, borderRadius:'50%', flexShrink:0,
        background: ok?'#10B981':'var(--c-border)',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'background .2s',
      }}>
        {ok && <CheckCircle size={11} style={{ color:'white' }}/>}
      </div>
      <span style={{ color:ok?'#10B981':'var(--t-muted)', transition:'color .2s' }}>
        {texto}
      </span>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────
export default function CambiarPassword({ usuario, onCambiado, onVolver }) {
  const [nueva,    setNueva]    = useState('')
  const [confirma, setConfirma] = useState('')
  const [showN,    setShowN]    = useState(false)
  const [showC,    setShowC]    = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [exito,    setExito]    = useState(false)

  const reglas = {
    min8:      nueva.length >= 8,
    mayuscula: /[A-Z]/.test(nueva),
    numero:    /[0-9]/.test(nueva),
    noDoc:     nueva !== '' && nueva !== String(usuario?.numeroDocumento ?? ''),
    coincide:  nueva !== '' && nueva === confirma,
  }
  const todoOk = Object.values(reglas).every(Boolean)

  const handleGuardar = async () => {
    if (!todoOk || loading) return
    setLoading(true); setError('')
    try {
      await api.post('/auth/change-password', { passwordNueva: nueva })
      setExito(true)
      setTimeout(() => onCambiado(), 1800)
    } catch (err) {
      setError(err.data?.error || err.message || 'Error al cambiar la contraseña')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-screen">

      {/* ── Panel izquierdo ── */}
      <motion.div
        className="login-panel"
        initial={{ opacity:0, x:-20 }}
        animate={{ opacity:1, x:0 }}
        transition={{ duration:0.4 }}
      >
        <div className="login-card">

          {/* Botón volver */}
          {onVolver && (
            <button
              onClick={onVolver}
              style={{ display:'flex', alignItems:'center', gap:6,
                background:'none', border:'none', cursor:'pointer',
                color:'var(--t-muted)', fontSize:13, fontWeight:600,
                padding:0, marginBottom:10 }}
            >
              <ArrowLeft size={15}/> Volver al inicio de sesión
            </button>
          )}

          {/* Encabezado */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{
              width:34, height:34, borderRadius:10, flexShrink:0,
              background:'linear-gradient(135deg,#6366F1,#4F46E5)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 4px 14px rgba(99,102,241,.4)',
            }}>
              <ShieldCheck size={20} style={{ color:'white' }}/>
            </div>
            <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
              letterSpacing:.9, color:'var(--t-muted)' }}>
              Primer acceso
            </span>
          </div>

          <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:-.5, marginBottom:4 }}>
            Bienvenido, {usuario?.nombre?.split(' ')[0] || 'usuario'}
          </h1>
          <p style={{ fontSize:12, color:'var(--t-muted)', marginBottom:12, lineHeight:1.4 }}>
            Por seguridad debes crear una contraseña<br/>personal antes de continuar al sistema.
          </p>

          {exito ? (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <CheckCircle size={52} style={{ color:'#10B981', margin:'0 auto 14px', display:'block' }}/>
              <div style={{ fontSize:17, fontWeight:800, color:'#10B981' }}>¡Contraseña actualizada!</div>
              <div style={{ fontSize:13, color:'var(--t-muted)', marginTop:6 }}>Ingresando al sistema…</div>
            </div>
          ) : (
            <>
              {/* Nueva contraseña */}
              <div style={{ marginBottom:8 }}>
                <label className="form-lbl">Nueva contraseña *</label>
                <div className="inp-wrap" style={{ position:'relative' }}>
                  <input
                    type={showN?'text':'password'}
                    value={nueva}
                    onChange={e=>setNueva(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="form-inp"
                  />
                  <button type="button" className="eye-btn-login" onClick={()=>setShowN(s=>!s)}>
                    {showN?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div style={{ marginBottom:10 }}>
                <label className="form-lbl">Confirmar contraseña *</label>
                <div className="inp-wrap" style={{ position:'relative' }}>
                  <input
                    type={showC?'text':'password'}
                    value={confirma}
                    onChange={e=>setConfirma(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="form-inp"
                  />
                  <button type="button" className="eye-btn-login" onClick={()=>setShowC(s=>!s)}>
                    {showC?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </div>

              {/* Requisitos */}
              <div style={{ padding:'8px 10px', borderRadius:10,
                background:'var(--c-surface2)', border:'1px solid var(--c-border)',
                marginBottom:10, display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ fontSize:10.5, fontWeight:800, textTransform:'uppercase',
                  letterSpacing:.8, color:'var(--t-muted)', marginBottom:2 }}>
                  Requisitos
                </div>
                <Regla ok={reglas.min8}      texto="Mínimo 8 caracteres"/>
                <Regla ok={reglas.mayuscula} texto="Al menos una mayúscula"/>
                <Regla ok={reglas.numero}    texto="Al menos un número"/>
                <Regla ok={reglas.noDoc}     texto="Diferente a tu número de documento"/>
                <Regla ok={reglas.coincide}  texto="Las contraseñas coinciden"/>
              </div>

              {/* Error */}
              {error && (
                <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:14,
                  background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)',
                  fontSize:12.5, color:'#EF4444', fontWeight:600 }}>
                  {error}
                </div>
              )}

              {/* Botón guardar */}
              <button
                onClick={handleGuardar}
                disabled={!todoOk||loading}
                style={{
                  width:'100%', padding:'13px', borderRadius:13, border:'none',
                  fontSize:14, fontWeight:800,
                  cursor: todoOk&&!loading?'pointer':'not-allowed',
                  background: todoOk?'linear-gradient(135deg,#6366F1,#4F46E5)':'var(--c-border)',
                  color: todoOk?'white':'var(--t-muted)',
                  boxShadow: todoOk?'0 6px 20px rgba(99,102,241,.4)':'none',
                  transition:'all .2s',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                <Lock size={15}/>
                {loading?'Guardando...':'Guardar contraseña y entrar'}
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Arte derecho ── */}
      <ArtBg/>

    </div>
  )
}
