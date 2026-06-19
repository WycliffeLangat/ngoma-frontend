export default function NotificationBell({ count = 0 }) {
  return <span className="cms-bell" title="Notifications">🔔{count > 0 && <b>{count}</b>}</span>;
}
