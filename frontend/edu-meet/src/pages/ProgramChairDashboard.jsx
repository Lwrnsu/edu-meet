import RoleStubDashboard from './RoleStubDashboard'

export default function ProgramChairDashboard({ user, onLogout }) {
  return (
    <RoleStubDashboard title="Program Chair" user={user} onLogout={onLogout} />
  )
}
