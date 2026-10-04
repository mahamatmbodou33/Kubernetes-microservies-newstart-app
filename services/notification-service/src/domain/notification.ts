export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  eventId: string | null;
  read: boolean;
  createdAt: string;
}

export type QueueStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

/** A row claimed from the event queue, ready for processing. */
export interface QueuedEvent {
  eventId: string;
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  attempts: number;
}
