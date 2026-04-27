export default function EmptyState({ icon, message, style }) {
  return (
    <div className="empty-state" style={style}>
      {icon && <div className="empty-ico">{icon}</div>}
      <p>{message}</p>
    </div>
  )
}
