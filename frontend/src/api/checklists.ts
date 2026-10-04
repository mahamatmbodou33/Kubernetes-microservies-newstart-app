import { apiRequest } from './client';
import type { ChecklistSummary, Paginated, Task, TaskCategory, TaskPriority, TaskStatus } from '../types';

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  category?: TaskCategory;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  category?: TaskCategory;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface ListTasksQuery {
  status?: TaskStatus;
  category?: TaskCategory;
  sort?: string;
  page?: number;
  limit?: number;
}

export type TaskListResponse = Paginated<Task> & { summary: ChecklistSummary };

export const checklistsApi = {
  createChecklist: (userId: string, includeDefaults: boolean) =>
    apiRequest('/api/v1/checklists', { method: 'POST', body: { userId, includeDefaults } }),

  listTasks: (userId: string, query: ListTasksQuery = {}) =>
    apiRequest<TaskListResponse>(`/api/v1/checklists/${userId}`, { query }),

  addTask: (userId: string, input: CreateTaskInput) =>
    apiRequest<Task>(`/api/v1/checklists/${userId}/tasks`, { method: 'POST', body: input }),

  updateTask: (taskId: string, input: UpdateTaskInput) =>
    apiRequest<Task>(`/api/v1/tasks/${taskId}`, { method: 'PATCH', body: input }),

  deleteTask: (taskId: string) =>
    apiRequest<void>(`/api/v1/tasks/${taskId}`, { method: 'DELETE' }),
};
