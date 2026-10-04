import { apiRequest } from './client';
import type { User } from '../types';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  location?: string | null;
  skills?: string[];
  preferredJobType?: string | null;
}

export const usersApi = {
  create: (input: CreateUserInput) =>
    apiRequest<User>('/api/v1/users', { method: 'POST', body: input }),

  get: (id: string) => apiRequest<User>(`/api/v1/users/${id}`),

  update: (id: string, input: CreateUserInput) =>
    apiRequest<User>(`/api/v1/users/${id}`, { method: 'PUT', body: input }),

  updateSkills: (id: string, skills: string[]) =>
    apiRequest<{ skills: string[] }>(`/api/v1/users/${id}/skills`, {
      method: 'PUT',
      body: { skills },
    }),
};
