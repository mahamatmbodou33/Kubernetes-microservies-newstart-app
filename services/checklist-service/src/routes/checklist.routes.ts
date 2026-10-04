import { Router } from 'express';
import { asyncHandler } from '@newstart/shared-utils';
import type { ChecklistController } from '../controllers/checklist.controller.js';

export function createChecklistRouter(controller: ChecklistController): Router {
  const router = Router();

  router.post('/checklists', asyncHandler(controller.createChecklist));
  router.get('/checklists/:userId', asyncHandler(controller.listTasks));
  router.post('/checklists/:userId/tasks', asyncHandler(controller.addTask));

  router.patch('/tasks/:taskId', asyncHandler(controller.updateTask));
  router.delete('/tasks/:taskId', asyncHandler(controller.deleteTask));

  return router;
}
