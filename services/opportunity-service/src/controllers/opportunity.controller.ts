import type { Request, Response } from 'express';
import { validate } from '@newstart/shared-utils';
import type { OpportunityService } from '../services/opportunity.service.js';
import {
  createOpportunitySchema,
  listQuerySchema,
  opportunityIdParamSchema,
  pageQuerySchema,
  recommendQuerySchema,
  saveOpportunityBodySchema,
  savedParamsSchema,
  updateOpportunitySchema,
  userIdParamSchema,
} from '../schemas/opportunity.schema.js';

export class OpportunityController {
  constructor(private readonly service: OpportunityService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = validate(createOpportunitySchema, req.body);
    const created = await this.service.create(body);
    res.status(201).json(created);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = validate(listQuerySchema, req.query);
    const { location, skill, type, remote, page, limit } = query;
    const result = await this.service.list({ location, skill, type, remote }, page, limit);
    res.status(200).json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(opportunityIdParamSchema, req.params);
    const opportunity = await this.service.getById(id);
    res.status(200).json(opportunity);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(opportunityIdParamSchema, req.params);
    const body = validate(updateOpportunitySchema, req.body);
    const updated = await this.service.update(id, body);
    res.status(200).json(updated);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(opportunityIdParamSchema, req.params);
    await this.service.delete(id);
    res.status(204).send();
  };

  recommended = async (req: Request, res: Response): Promise<void> => {
    const { userId } = validate(userIdParamSchema, req.params);
    const { limit } = validate(recommendQuerySchema, req.query);
    const data = await this.service.recommendForUser(userId, limit, req.requestId);
    res.status(200).json({ data });
  };

  save = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(opportunityIdParamSchema, req.params);
    const { userId } = validate(saveOpportunityBodySchema, req.body);
    const opportunity = await this.service.saveOpportunity(userId, id);
    res.status(201).json(opportunity);
  };

  unsave = async (req: Request, res: Response): Promise<void> => {
    const { id, userId } = validate(savedParamsSchema, req.params);
    await this.service.unsaveOpportunity(userId, id);
    res.status(204).send();
  };

  listSaved = async (req: Request, res: Response): Promise<void> => {
    const { userId } = validate(userIdParamSchema, req.params);
    const { page, limit } = validate(pageQuerySchema, req.query);
    const result = await this.service.listSaved(userId, page, limit);
    res.status(200).json(result);
  };
}
