import Header from './Header'

export default function AppShell({ currentView, onNavigate, children }) {
  return (
    <div className="shell">
      <Header currentView={currentView} onNavigate={onNavigate} />
      <div className="page-area">{children}</div>
    </div>
  )
}
