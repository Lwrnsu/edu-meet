export default function RoleStubDashboard({ title, user, onLogout }) {
  const name = user?.first_name || user?.email || 'there'
  const schoolName = user?.school?.name
  const roleLabel = user?.role_label || title

  return (
    <main className="home">
      <div className="home__panel">
        <p className="home__brand">Edu-Meet</p>
        <h1 className="home__greeting">{title}</h1>
        <p className="home__email">Welcome back, {name}.</p>
        <p className="home__email">{user?.email}</p>
        {roleLabel ? <p className="home__email">Role: {roleLabel}</p> : null}
        {schoolName ? <p className="home__email">School: {schoolName}</p> : null}
        <button className="home__logout" type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </main>
  )
}
