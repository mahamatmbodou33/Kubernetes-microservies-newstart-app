import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { notificationsApi } from '../api/notifications';

export function NotificationsPage(): JSX.Element {
  const { user } = useAuth();
  const userId = user!.id;
  const { data, loading, error } = useAsync(() => notificationsApi.list(userId, 1, 50), [userId]);

  return (
    <div className="page narrow">
      <h1>Notifications</h1>
      <p className="muted small">
        Notifications are produced asynchronously by the notification worker; there may be a short
        delay after an action.
      </p>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {data && data.data.length === 0 && <p className="muted">No notifications yet.</p>}
      <ul className="notif-list">
        {data?.data.map((n) => (
          <li key={n.id} className="card notif">
            <div className="notif-head">
              <strong>{n.title}</strong>
              <span className="muted small">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <p className="muted">{n.body}</p>
            <span className="badge">{n.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
