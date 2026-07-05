import { usePermission } from './PermissionContext'

// Declarative conditional rendering built on usePermission — e.g.
// <PermissionGate module="approvals" action="approve"><Btn .../></PermissionGate>
export default function PermissionGate({ module, action, fallback = null, children }) {
  const allowed = usePermission(module, action)
  return allowed ? children : fallback
}
