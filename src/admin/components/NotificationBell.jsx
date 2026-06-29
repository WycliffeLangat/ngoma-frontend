export default function NotificationBell({ count = 0 }) {
  return (
    <button type="button" className="cms-bell" title="Notifications" aria-label={`${count} unread notifications`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
      </svg>
      {count > 0 && <b>{count}</b>}
    </button>
  );
}
