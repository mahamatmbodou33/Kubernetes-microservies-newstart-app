import { ConflictError, NotFoundError, DomainError } from '@newstart/shared-utils';
import { buildPageMeta, type PaginatedResult } from '@newstart/shared-types';
import { createEvent, type MessagePublisher } from '@newstart/shared-events';
import type {
  Checklist,
  ChecklistSummary,
  CreateTaskInput,
  Task,
  TaskFilter,
  UpdateTaskInput,
} from '../domain/task.js';
import type { ChecklistRepository } from '../repositories/checklist.repository.js';
import { DEFAULT_TASKS } from '../domain/default-tasks.js';
import { isValidTransition } from '../domain/status.js';

export class ChecklistService {
  constructor(
    private readonly repo: ChecklistRepository,
    private readonly publisher: MessagePublisher,
  ) {}

  /** Create a user's checklist, optionally seeding the default relocation tasks. */
  async createChecklist(
    userId: string,
    includeDefaults: boolean,
  ): Promise<{ checklist: Checklist; tasks: Task[] }> {
    const existing = await this.repo.findChecklistByUser(userId);
    if (existing) {
      throw new ConflictError(`A checklist already exists for user ${userId}`);
    }

    const checklist = await this.repo.createChecklist(userId);
    const tasks: Task[] = [];
    if (includeDefaults) {
      for (const template of DEFAULT_TASKS) {
        tasks.push(await this.repo.createTask(checklist.id, userId, template));
      }
    }
    return { checklist, tasks };
  }

  /** Ensure a checklist exists for the user, creating an empty one if needed. */
  private async ensureChecklist(userId: string): Promise<Checklist> {
    const existing = await this.repo.findChecklistByUser(userId);
    return existing ?? this.repo.createChecklist(userId);
  }

  async addTask(userId: string, input: CreateTaskInput): Promise<Task> {
    const checklist = await this.ensureChecklist(userId);
    const task = await this.repo.createTask(checklist.id, userId, input);

    await this.publisher.publish(
      createEvent('TASK_CREATED', 'checklist-service', {
        taskId: task.id,
        userId,
        title: task.title,
      }),
    );
    return task;
  }

  async listTasks(
    userId: string,
    filter: TaskFilter,
    sort: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Task> & { summary: ChecklistSummary }> {
    const [{ items, total }, summary] = await Promise.all([
      this.repo.listTasks(userId, filter, sort, page, limit),
      this.repo.summary(userId),
    ]);
    return { data: items, meta: buildPageMeta(total, page, limit), summary };
  }

  async getSummary(userId: string): Promise<ChecklistSummary> {
    return this.repo.summary(userId);
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.repo.findTaskById(taskId);
    if (!existing) {
      throw new NotFoundError(`Task ${taskId} was not found`);
    }

    if (input.status && input.status !== existing.status) {
      if (!isValidTransition(existing.status, input.status)) {
        throw new DomainError(
          'INVALID_STATUS_TRANSITION',
          409,
          `Cannot change task status from ${existing.status} to ${input.status}`,
        );
      }
    }

    const updated = await this.repo.updateTask(taskId, input);
    if (!updated) {
      throw new NotFoundError(`Task ${taskId} was not found`);
    }

    // Emit a completion event only on the transition into COMPLETED.
    if (updated.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await this.publisher.publish(
        createEvent('TASK_COMPLETED', 'checklist-service', {
          taskId: updated.id,
          userId: updated.userId,
          title: updated.title,
        }),
      );
    }
    return updated;
  }

  async deleteTask(taskId: string): Promise<void> {
    const deleted = await this.repo.deleteTask(taskId);
    if (!deleted) {
      throw new NotFoundError(`Task ${taskId} was not found`);
    }
  }
}
