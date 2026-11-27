import CollegeAdminDashboard from '../pages/CollegeAdminDashboard'
import CollegeDeanDashboard from '../pages/CollegeDeanDashboard'
import FacultyDashboard from '../pages/FacultyDashboard'
import ProgramChairDashboard from '../pages/ProgramChairDashboard'
import StudentDashboard from '../pages/StudentDashboard'
import { useAuth } from './AuthProvider'

export default function SchoolPortalRoute() {
  const { user, schoolRole, handleLogout } = useAuth()
  const role = schoolRole || user?.role

  switch (role) {
    case 'college_admin':
      return <CollegeAdminDashboard user={user} onLogout={handleLogout} />
    case 'college_dean':
      return <CollegeDeanDashboard user={user} onLogout={handleLogout} />
    case 'program_chair':
      return <ProgramChairDashboard user={user} onLogout={handleLogout} />
    case 'faculty':
      return <FacultyDashboard user={user} onLogout={handleLogout} />
    case 'student':
      return <StudentDashboard user={user} onLogout={handleLogout} />
    default: {
      const name = user?.first_name || user?.email || 'there'
      return (
        <main className="home">
          <div className="home__panel">
            <p className="home__brand">Edu-Meet</p>
            <h1 className="home__greeting">Welcome back, {name}.</h1>
            <p className="home__email">{user?.email}</p>
            {user?.role_label ? <p className="home__email">Role: {user.role_label}</p> : null}
            <button className="home__logout" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </main>
      )
    }
  }
}
