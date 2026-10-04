import type { CreateTaskInput } from './task.js';

/**
 * Optional default relocation tasks seeded when a user creates their first checklist.
 * These are general relocation to-dos only — NOT legal or immigration advice.
 */
export const DEFAULT_TASKS: CreateTaskInput[] = [
  { title: 'Create a professional resume', category: 'EMPLOYMENT', priority: 'HIGH' },
  { title: 'Set up a local bank account', category: 'FINANCE', priority: 'HIGH' },
  { title: 'Research local transportation', category: 'TRANSPORTATION', priority: 'MEDIUM' },
  { title: 'Find healthcare resources', category: 'HEALTHCARE', priority: 'MEDIUM' },
  { title: 'Create a professional networking profile', category: 'EMPLOYMENT', priority: 'MEDIUM' },
  { title: 'Research employment programs', category: 'EMPLOYMENT', priority: 'MEDIUM' },
  { title: 'Research local training opportunities', category: 'EDUCATION', priority: 'LOW' },
  { title: 'Create an emergency contact list', category: 'OTHER', priority: 'LOW' },
];
