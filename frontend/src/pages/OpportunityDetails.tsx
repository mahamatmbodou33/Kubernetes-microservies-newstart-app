import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { opportunitiesApi } from '../api/opportunities';
import { ApiError } from '../api/client';

export function OpportunityDetailsPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, loading, error } = useAsync(() => opportunitiesApi.get(id!), [id]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(): Promise<void> {
    setSaveError(null);
    try {
      await opportunitiesApi.save(id!, user!.id);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save');
    }
  }

  if (loading) return <p className="muted page">Loading…</p>;
  if (error || !data) return <div className="banner banner-error page">{error ?? 'Not found'}</div>;

  return (
    <div className="page narrow">
      <Link to="/opportunities" className="link">
        ← Back to opportunities
      </Link>
      <div className="card">
        <div className="opp-head">
          <h1>{data.title}</h1>
          <span className="badge">{data.type}</span>
        </div>
        <p className="muted">
          {data.organization ?? 'Unknown org'} · {data.location ?? 'Anywhere'}
          {data.remote ? ' · Remote' : ''}
        </p>
        {data.description && <p>{data.description}</p>}

        <div className="field">
          <span className="field-label">Skills</span>
          <div className="chips">
            {data.skills.length === 0 && <span className="muted">No specific skills required.</span>}
            {data.skills.map((s) => (
              <span key={s} className="chip chip-sm">
                {s}
              </span>
            ))}
          </div>
        </div>

        {data.url && (
          <p>
            <a href={data.url} target="_blank" rel="noreferrer" className="link">
              Visit link ↗
            </a>
          </p>
        )}

        {saveError && <div className="banner banner-error">{saveError}</div>}
        <button className="btn btn-primary" onClick={save} disabled={saved}>
          {saved ? 'Saved ✓' : 'Save opportunity'}
        </button>
      </div>
    </div>
  );
}
