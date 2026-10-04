import { apiRequest } from './client';
import type { NotificationRecord, Paginated } from '../types';

export const notificationsApi = {
  list: (userId: string, page = 1, limit = 20) =>
    apiRequest<Paginated<NotificationRecord>>(`/api/v1/notifications/${userId}`, {
      query: { page, limit },
    }),
};
