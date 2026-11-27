import RoleStubDashboard from './RoleStubDashboard'

export default function CollegeDeanDashboard({ user, onLogout }) {
  return (
    <RoleStubDashboard title="College Dean" user={user} onLogout={onLogout} />
  )
}
