import { Router } from 'express';
import { asyncHandler } from '@newstart/shared-utils';
import type { OpportunityController } from '../controllers/opportunity.controller.js';

export function createOpportunityRouter(controller: OpportunityController): Router {
  const router = Router();

  router.post('/opportunities', asyncHandler(controller.create));
  router.get('/opportunities', asyncHandler(controller.list));

  // Register specific routes before the ":id" route so they are not shadowed.
  router.get('/opportunities/recommended/:userId', asyncHandler(controller.recommended));

  // Saved opportunities.
  router.get('/saved/:userId', asyncHandler(controller.listSaved));
  router.post('/opportunities/:id/save', asyncHandler(controller.save));
  router.delete('/opportunities/:id/save/:userId', asyncHandler(controller.unsave));

  router.get('/opportunities/:id', asyncHandler(controller.getById));
  router.put('/opportunities/:id', asyncHandler(controller.update));
  router.delete('/opportunities/:id', asyncHandler(controller.remove));

  return router;
}
