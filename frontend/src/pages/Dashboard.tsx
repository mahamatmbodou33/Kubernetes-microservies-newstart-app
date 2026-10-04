import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { opportunitiesApi } from '../api/opportunities';
import { checklistsApi } from '../api/checklists';
import { notificationsApi } from '../api/notifications';
import type { User } from '../types';

function profileCompletion(user: User): number {
  const checks = [
    Boolean(user.firstName),
    Boolean(user.lastName),
    Boolean(user.email),
    Boolean(user.location),
    user.skills.length > 0,
    Boolean(user.preferredJobType),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const userId = user!.id;

  const recommended = useAsync(() => opportunitiesApi.recommended(userId, 5), [userId]);
  const tasks = useAsync(
    () => checklistsApi.listTasks(userId, { sort: 'dueDate', limit: 5 }),
    [userId],
  );
  const notifications = useAsync(() => notificationsApi.list(userId, 1, 5), [userId]);

  const completion = profileCompletion(user!);
  const summary = tasks.data?.summary;
  const upcoming = (tasks.data?.data ?? []).filter((t) => t.status !== 'COMPLETED');

  return (
    <div className="page">
      <h1>Welcome, {user!.firstName} 👋</h1>

      <div className="grid">
        <section className="card">
          <h2>Profile completion</h2>
          <ProgressBar percent={completion} />
          <p className="muted">{completion}% complete</p>
          <Link to="/profile" className="btn btn-ghost">
            Update profile
          </Link>
        </section>

        <section className="card">
          <h2>Checklist progress</h2>
          {summary ? (
            <>
              <ProgressBar percent={summary.completionPercentage} />
              <p className="muted">
                {summary.completed}/{summary.total} tasks completed
              </p>
            </>
          ) : (
            <p className="muted">No tasks yet.</p>
          )}
          <Link to="/checklist" className="btn btn-ghost">
            Open checklist
          </Link>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Recommended opportunities</h2>
          <Link to="/opportunities" className="link">
            Browse all
          </Link>
        </div>
        {recommended.loading && <p className="muted">Loading…</p>}
        {recommended.error && <div className="banner banner-error">{recommended.error}</div>}
        {recommended.data && recommended.data.data.length === 0 && (
          <p className="muted">No recommendations yet. Add skills to your profile.</p>
        )}
        <ul className="list">
          {recommended.data?.data.map((o) => (
            <li key={o.id} className="list-item">
              <Link to={`/opportunities/${o.id}`}>{o.title}</Link>
              <span className="badge badge-score">{o.matchScore}% match</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Upcoming tasks</h2>
          {upcoming.length === 0 && <p className="muted">Nothing upcoming.</p>}
          <ul className="list">
            {upcoming.map((t) => (
              <li key={t.id} className="list-item">
                <span>{t.title}</span>
                <span className="badge">{t.dueDate ?? t.priority}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Recent notifications</h2>
          {notifications.data && notifications.data.data.length === 0 && (
            <p className="muted">No notifications.</p>
          )}
          <ul className="list">
            {notifications.data?.data.map((n) => (
              <li key={n.id} className="list-item">
                <span>{n.title}</span>
                <span className="muted small">{new Date(n.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          <Link to="/notifications" className="btn btn-ghost">
            View all
          </Link>
        </section>
      </div>
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }): JSX.Element {
  return (
    <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
