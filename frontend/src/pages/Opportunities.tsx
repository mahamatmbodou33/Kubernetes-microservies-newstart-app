import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { opportunitiesApi, type OpportunityFilters } from '../api/opportunities';
import { ApiError } from '../api/client';
import type { Opportunity } from '../types';

const TYPES = ['', 'JOB', 'TRAINING', 'COMMUNITY', 'EVENT', 'RESOURCE'];

export function OpportunitiesPage(): JSX.Element {
  const { user } = useAuth();
  const [filters, setFilters] = useState<OpportunityFilters>({ page: 1, limit: 10 });
  const [sort, setSort] = useState<'newest' | 'title'>('newest');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const query = useAsync(() => opportunitiesApi.list(filters), [JSON.stringify(filters)]);

  const items = useMemo(() => {
    const data = query.data?.data ?? [];
    if (sort === 'title') return [...data].sort((a, b) => a.title.localeCompare(b.title));
    return data;
  }, [query.data, sort]);

  function update(patch: Partial<OpportunityFilters>): void {
    setFilters((prev) => ({ ...prev, page: 1, ...patch }));
  }

  async function save(o: Opportunity): Promise<void> {
    try {
      await opportunitiesApi.save(o.id, user!.id);
      setSavedIds((prev) => new Set(prev).add(o.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not save');
    }
  }

  const meta = query.data?.meta;

  return (
    <div className="page">
      <h1>Opportunities</h1>

      <div className="filters card">
        <input
          placeholder="Location"
          onChange={(e) => update({ location: e.target.value || undefined })}
        />
        <input
          placeholder="Skill (e.g. AWS)"
          onChange={(e) => update({ skill: e.target.value || undefined })}
        />
        <select onChange={(e) => update({ type: e.target.value || undefined })}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === '' ? 'All types' : t}
            </option>
          ))}
        </select>
        <label className="inline">
          <input
            type="checkbox"
            onChange={(e) => update({ remote: e.target.checked ? true : undefined })}
          />
          Remote only
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'title')}>
          <option value="newest">Sort: Newest</option>
          <option value="title">Sort: Title A–Z</option>
        </select>
      </div>

      {query.loading && <p className="muted">Loading…</p>}
      {query.error && <div className="banner banner-error">{query.error}</div>}
      {query.data && items.length === 0 && <p className="muted">No opportunities match your filters.</p>}

      <ul className="cards">
        {items.map((o) => (
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
            <div className="chips">
              {o.skills.map((s) => (
                <span key={s} className="chip chip-sm">
                  {s}
                </span>
              ))}
            </div>
            <div className="opp-actions">
              <Link to={`/opportunities/${o.id}`} className="btn btn-ghost">
                Details
              </Link>
              <button
                className="btn btn-primary"
                onClick={() => save(o)}
                disabled={savedIds.has(o.id)}
              >
                {savedIds.has(o.id) ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {meta && meta.totalPages > 1 && (
        <div className="pager">
          <button
            className="btn btn-ghost"
            disabled={!meta.hasPrev}
            onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
          >
            ← Prev
          </button>
          <span className="muted">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            className="btn btn-ghost"
            disabled={!meta.hasNext}
            onClick={() => setFilters((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
