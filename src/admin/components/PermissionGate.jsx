export default function PermissionGate({ user, permission, children, fallback = null }) {
  if (!permission) return children;
  if (user?.permissions?.[permission]) return children;
  return fallback;
}
