import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { opportunitiesApi } from '../api/opportunities';
import { ApiError } from '../api/client';

export function SavedOpportunitiesPage(): JSX.Element {
  const { user } = useAuth();
  const userId = user!.id;
  const { data, loading, error, reload } = useAsync(() => opportunitiesApi.listSaved(userId), [userId]);

  async function remove(opportunityId: string): Promise<void> {
    try {
      await opportunitiesApi.unsave(opportunityId, userId);
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not remove');
    }
  }

  return (
    <div className="page">
      <h1>Saved opportunities</h1>
      {loading && <p className="muted">Loading…</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {data && data.data.length === 0 && (
        <p className="muted">
          You have not saved any opportunities yet. <Link to="/opportunities">Browse some →</Link>
        </p>
      )}
      <ul className="cards">
        {data?.data.map((o) => (
          <li key={o.id} className="card opp-card">
            <div className="opp-head">
              <Link to={`/opportunities/${o.id}`} className="opp-title">
                {o.title}
              </Link>
              <span className="badge">{o.type}</span>
            </div>
            <p className="muted">
              {o.organization ?? 'Unknown org'} · {o.location ?? 'Anywhere'}
              {o.remote ? ' · Remote' : ''}
            </p>
            <div className="opp-actions">
              <Link to={`/opportunities/${o.id}`} className="btn btn-ghost">
                Details
              </Link>
              <button className="btn btn-danger" onClick={() => remove(o.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
