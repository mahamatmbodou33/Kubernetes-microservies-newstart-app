import { Router } from 'express';
import { asyncHandler } from '@newstart/shared-utils';
import type { UserController } from '../controllers/user.controller.js';

export function createUserRouter(controller: UserController): Router {
  const router = Router();

  router.post('/users', asyncHandler(controller.createUser));
  router.get('/users/:id', asyncHandler(controller.getUser));
  router.put('/users/:id', asyncHandler(controller.updateUser));
  router.delete('/users/:id', asyncHandler(controller.deleteUser));

  router.get('/users/:id/skills', asyncHandler(controller.getSkills));
  router.put('/users/:id/skills', asyncHandler(controller.updateSkills));

  return router;
}
