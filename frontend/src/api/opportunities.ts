import { apiRequest } from './client';
import type { Opportunity, Paginated, ScoredOpportunity } from '../types';

export interface OpportunityFilters {
  location?: string;
  skill?: string;
  type?: string;
  remote?: boolean;
  page?: number;
  limit?: number;
}

export const opportunitiesApi = {
  list: (filters: OpportunityFilters = {}) =>
    apiRequest<Paginated<Opportunity>>('/api/v1/opportunities', { query: filters }),

  get: (id: string) => apiRequest<Opportunity>(`/api/v1/opportunities/${id}`),

  recommended: (userId: string, limit = 5) =>
    apiRequest<{ data: ScoredOpportunity[] }>(`/api/v1/opportunities/recommended/${userId}`, {
      query: { limit },
    }),

  save: (opportunityId: string, userId: string) =>
    apiRequest<Opportunity>(`/api/v1/opportunities/${opportunityId}/save`, {
      method: 'POST',
      body: { userId },
    }),

  unsave: (opportunityId: string, userId: string) =>
    apiRequest<void>(`/api/v1/opportunities/${opportunityId}/save/${userId}`, {
      method: 'DELETE',
    }),

  listSaved: (userId: string, page = 1, limit = 20) =>
    apiRequest<Paginated<Opportunity>>(`/api/v1/saved/${userId}`, { query: { page, limit } }),
};
