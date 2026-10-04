import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { checklistsApi, type CreateTaskInput, type ListTasksQuery } from '../api/checklists';
import { ApiError } from '../api/client';
import { ProgressBar } from './Dashboard';
import type { TaskCategory, TaskPriority, TaskStatus } from '../types';

const STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
const CATEGORIES: TaskCategory[] = [
  'HOUSING',
  'EMPLOYMENT',
  'TRANSPORTATION',
  'HEALTHCARE',
  'FINANCE',
  'EDUCATION',
  'OTHER',
];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export function ChecklistPage(): JSX.Element {
  const { user } = useAuth();
  const userId = user!.id;
  const [query, setQuery] = useState<ListTasksQuery>({ sort: '-priority', limit: 50 });
  const [form, setForm] = useState<CreateTaskInput>({ title: '', category: 'OTHER', priority: 'MEDIUM' });
  const [error, setError] = useState<string | null>(null);

  const tasks = useAsync(() => checklistsApi.listTasks(userId, query), [userId, JSON.stringify(query)]);
  const summary = tasks.data?.summary;

  async function run(action: () => Promise<unknown>): Promise<void> {
    setError(null);
    try {
      await action();
      tasks.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  async function addTask(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.title.trim()) return;
    await run(async () => {
      await checklistsApi.addTask(userId, form);
      setForm({ title: '', category: 'OTHER', priority: 'MEDIUM' });
    });
  }

  return (
    <div className="page">
      <h1>Relocation checklist</h1>
      <p className="muted small">General relocation tasks only — not legal or immigration advice.</p>

      <section className="card">
        <h2>Progress</h2>
        <ProgressBar percent={summary?.completionPercentage ?? 0} />
        <p className="muted">
          {summary?.completed ?? 0}/{summary?.total ?? 0} completed
        </p>
        {summary && summary.total === 0 && (
          <button
            className="btn btn-primary"
            onClick={() => run(() => checklistsApi.createChecklist(userId, true))}
          >
            Start with default tasks
          </button>
        )}
      </section>

      <section className="card">
        <h2>Add a task</h2>
        <form className="form" onSubmit={addTask}>
          <div className="row">
            <input
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={form.dueDate ?? ''}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
            />
            <button className="btn btn-primary">Add</button>
          </div>
        </form>
      </section>

      <div className="filters card">
        <select
          value={query.status ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, status: (e.target.value || undefined) as TaskStatus | undefined }))}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={query.category ?? ''}
          onChange={(e) =>
            setQuery((q) => ({ ...q, category: (e.target.value || undefined) as TaskCategory | undefined }))
          }
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={query.sort} onChange={(e) => setQuery((q) => ({ ...q, sort: e.target.value }))}>
          <option value="-priority">Priority (high→low)</option>
          <option value="dueDate">Due date</option>
          <option value="-createdAt">Newest</option>
          <option value="title">Title</option>
        </select>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {tasks.loading && <p className="muted">Loading…</p>}

      <ul className="task-list">
        {tasks.data?.data.map((t) => (
          <li key={t.id} className={`task-row status-${t.status.toLowerCase()}`}>
            <div className="task-main">
              <span className="task-title">{t.title}</span>
              <span className="task-meta">
                <span className={`badge prio-${t.priority.toLowerCase()}`}>{t.priority}</span>
                <span className="badge">{t.category}</span>
                {t.dueDate && <span className="muted small">due {t.dueDate}</span>}
              </span>
            </div>
            <div className="task-actions">
              <select
                value={t.status}
                onChange={(e) =>
                  run(() => checklistsApi.updateTask(t.id, { status: e.target.value as TaskStatus }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <button className="btn btn-danger" onClick={() => run(() => checklistsApi.deleteTask(t.id))}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {tasks.data && tasks.data.data.length === 0 && <p className="muted">No tasks match.</p>}
    </div>
  );
}
