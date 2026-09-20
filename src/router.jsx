import CaptchaApp from './App.jsx'
import WordArtRoute from './routes/WordArtRoute.jsx'

const routes = {
  '/': CaptchaApp,
  '/captcha': CaptchaApp,
  '/wordArt': WordArtRoute,
  '/wordart': WordArtRoute,
  '/collage': WordArtRoute,
  '/poster': WordArtRoute,
}

function normalizePath(pathname) {
  const path = pathname.replace(/\/+$/, '')
  return path || '/'
}

export default function Router() {
  const Route = routes[normalizePath(window.location.pathname)]

  if (!Route) {
    return (
      <main className="route-placeholder">
        <p className="route-placeholder-kicker">404</p>
        <h1>页面不存在</h1>
        <a href="/captcha">返回二维码入口</a>
      </main>
    )
  }

  return <Route />
}
