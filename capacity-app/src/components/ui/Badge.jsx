import { MODEL_BADGE } from '../../data/categories'

export function ModelBadge({ model, style }) {
  return (
    <span className={`badge ${MODEL_BADGE[model] ?? 'badge-gray'}`} style={style}>
      {model}
    </span>
  )
}

export function StatusBadge({ status }) {
  const cfg = {
    aprobado:  { cls: 'badge-green',  label: 'Aprobado' },
    enviado:   { cls: 'badge-blue',   label: 'Enviado' },
    borrador:  { cls: 'badge-amber',  label: 'Borrador' },
    rechazado: { cls: 'badge-red',    label: 'Rechazado' },
    activo:    { cls: 'badge-accent', label: 'Activo' },
    cerrado:   { cls: 'badge-green',  label: 'Cerrado' },
    finalizado:{ cls: 'badge-green',  label: 'Finalizado' },
    en_progreso:{ cls: 'badge-amber', label: 'En progreso' },
    pendiente_correccion: { cls: 'badge-amber', label: 'Pendiente' },
  }
  const c = cfg[status] ?? cfg.borrador
  return <span className={`badge ${c.cls}`}>{c.label}</span>
}

export default function Badge({ children, className = '', style }) {
  return (
    <span className={`badge ${className}`} style={style}>
      {children}
    </span>
  )
}
