import RoleStubDashboard from './RoleStubDashboard'

export default function StudentDashboard({ user, onLogout }) {
  return (
    <RoleStubDashboard title="Student" user={user} onLogout={onLogout} />
  )
}