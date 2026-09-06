import { Outlet, useLocation } from 'react-router'
import { Header } from '../components/Header'

export function SiteLayout() {
  const location = useLocation()

  return (
    <div className="site-shell">
      <Header />
      <main className="site-main" key={location.pathname}>
        <Outlet />
      </main>
    </div>
  )
}
