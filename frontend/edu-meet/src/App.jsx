import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import { clearSession, getSession } from './lib/authStorage'

function App() {
  const [session, setSessionState] = useState(() => getSession())

  function handleLoginSuccess(data) {
    setSessionState({ token: data.token, user: data.user })
  }

  function handleLogout() {
    clearSession()
    setSessionState(null)
  }

  if (!session) {
    return <LoginPage onSuccess={handleLoginSuccess} />
  }

  const name = session.user?.first_name || session.user?.email || 'there'

  return (
    <main className="home">
      <div className="home__panel">
        <p className="home__brand">Edu-Meet</p>
        <h1 className="home__greeting">Welcome back, {name}.</h1>
        <p className="home__email">{session.user?.email}</p>
        <button className="home__logout" type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </main>
  )
}

export default App
