export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string | null;
  skills: string[];
  preferredJobType: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityType = 'JOB' | 'TRAINING' | 'COMMUNITY' | 'EVENT' | 'RESOURCE';

export interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  type: OpportunityType;
  organization: string | null;
  location: string | null;
  remote: boolean;
  skills: string[];
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoredOpportunity extends Opportunity {
  matchScore: number;
  matchedSkills: string[];
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskCategory =
  | 'HOUSING'
  | 'EMPLOYMENT'
  | 'TRANSPORTATION'
  | 'HEALTHCARE'
  | 'FINANCE'
  | 'EDUCATION'
  | 'OTHER';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  userId: string;
  checklistId: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionPercentage: number;
}

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

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorBody {
  error: { code: string; message: string; requestId: string; details?: unknown };
}
