import RoleStubDashboard from './RoleStubDashboard'

export default function FacultyDashboard({ user, onLogout }) {
  return (
    <RoleStubDashboard title="Faculty" user={user} onLogout={onLogout} />
  )
}
