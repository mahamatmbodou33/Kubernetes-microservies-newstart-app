import { v4 as uuidv4 } from 'uuid';
import type {
  Checklist,
  ChecklistSummary,
  CreateTaskInput,
  Task,
  TaskFilter,
  UpdateTaskInput,
} from '../domain/task.js';
import type { Queryable } from '../db/pool.js';

interface ChecklistRow {
  id: string;
  user_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TaskRow {
  id: string;
  user_id: string;
  checklist_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function mapChecklist(row: ChecklistRow): Checklist {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    checklistId: row.checklist_id,
    title: row.title,
    description: row.description,
    category: row.category as Task['category'],
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    dueDate: toDateOnly(row.due_date),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

const SORT_COLUMNS: Record<string, string> = {
  createdAt: 'created_at',
  dueDate: 'due_date',
  status: 'status',
  title: 'title',
};

const UPDATE_COLUMNS: Record<string, string> = {
  title: 'title',
  description: 'description',
  category: 'category',
  status: 'status',
  priority: 'priority',
  dueDate: 'due_date',
};

export class ChecklistRepository {
  constructor(private readonly db: Queryable) {}

  async findChecklistByUser(userId: string): Promise<Checklist | null> {
    const { rows } = await this.db.query<ChecklistRow>(
      'SELECT * FROM checklists WHERE user_id = $1',
      [userId],
    );
    return rows[0] ? mapChecklist(rows[0]) : null;
  }

  async createChecklist(userId: string): Promise<Checklist> {
    const id = uuidv4();
    const { rows } = await this.db.query<ChecklistRow>(
      'INSERT INTO checklists (id, user_id) VALUES ($1, $2) RETURNING *',
      [id, userId],
    );
    return mapChecklist(rows[0]!);
  }

  async createTask(checklistId: string, userId: string, input: CreateTaskInput): Promise<Task> {
    const id = uuidv4();
    const { rows } = await this.db.query<TaskRow>(
      `INSERT INTO tasks
         (id, checklist_id, user_id, title, description, category, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        checklistId,
        userId,
        input.title,
        input.description ?? null,
        input.category ?? 'OTHER',
        input.status ?? 'PENDING',
        input.priority ?? 'MEDIUM',
        input.dueDate ?? null,
      ],
    );
    return mapTask(rows[0]!);
  }

  async findTaskById(taskId: string): Promise<Task | null> {
    const { rows } = await this.db.query<TaskRow>('SELECT * FROM tasks WHERE id = $1', [taskId]);
    return rows[0] ? mapTask(rows[0]) : null;
  }

  private buildOrderBy(sort: string): string {
    const desc = sort.startsWith('-');
    const field = desc ? sort.slice(1) : sort;
    const direction = desc ? 'DESC' : 'ASC';

    if (field === 'priority') {
      // Rank by logical magnitude (HIGH=2 > MEDIUM=1 > LOW=0) so that `-priority`
      // (descending) lists HIGH first, matching user expectations — not alphabetical.
      return `ORDER BY (CASE priority WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 1 ELSE 0 END) ${direction}`;
    }
    const column = SORT_COLUMNS[field] ?? 'created_at';
    return `ORDER BY ${column} ${direction}`;
  }

  async listTasks(
    userId: string,
    filter: TaskFilter,
    sort: string,
    page: number,
    limit: number,
  ): Promise<{ items: Task[]; total: number }> {
    const conditions = ['user_id = $1'];
    const values: unknown[] = [userId];
    let i = 2;

    if (filter.status) {
      conditions.push(`status = $${i++}`);
      values.push(filter.status);
    }
    if (filter.category) {
      conditions.push(`category = $${i++}`);
      values.push(filter.category);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM tasks ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const offset = (page - 1) * limit;
    const { rows } = await this.db.query<TaskRow>(
      `SELECT * FROM tasks ${where} ${this.buildOrderBy(sort)}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    return { items: rows.map(mapTask), total };
  }

  async summary(userId: string): Promise<ChecklistSummary> {
    const { rows } = await this.db.query<{ status: string; count: string }>(
      'SELECT status, COUNT(*)::int AS count FROM tasks WHERE user_id = $1 GROUP BY status',
      [userId],
    );
    const counts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 } as Record<string, number>;
    for (const row of rows) counts[row.status] = Number(row.count);

    const total = counts.PENDING! + counts.IN_PROGRESS! + counts.COMPLETED!;
    const completed = counts.COMPLETED!;
    return {
      total,
      completed,
      inProgress: counts.IN_PROGRESS!,
      pending: counts.PENDING!,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, column] of Object.entries(UPDATE_COLUMNS)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        sets.push(`${column} = $${i++}`);
        values.push(value);
      }
    }
    if (sets.length === 0) return this.findTaskById(taskId);

    sets.push('updated_at = now()');
    values.push(taskId);

    const { rows } = await this.db.query<TaskRow>(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ? mapTask(rows[0]) : null;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    return (rowCount ?? 0) > 0;
  }
}
