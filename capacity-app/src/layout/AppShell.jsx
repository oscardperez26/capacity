import Header from './Header'

export default function AppShell({ children }) {
  return (
    <div className="shell">
      <Header />
      <div className="page-area">{children}</div>
    </div>
  )
}
