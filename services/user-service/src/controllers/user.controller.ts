import type { Request, Response } from 'express';
import { validate } from '@newstart/shared-utils';
import type { UserService } from '../services/user.service.js';
import {
  createUserSchema,
  updateSkillsSchema,
  updateUserSchema,
  userIdParamSchema,
} from '../schemas/user.schema.js';

/** HTTP controllers: validate input, delegate to the service, map results to responses. */
export class UserController {
  constructor(private readonly service: UserService) {}

  createUser = async (req: Request, res: Response): Promise<void> => {
    const body = validate(createUserSchema, req.body);
    const user = await this.service.createUser(body);
    res.status(201).json(user);
  };

  getUser = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(userIdParamSchema, req.params);
    const user = await this.service.getUser(id);
    res.status(200).json(user);
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(userIdParamSchema, req.params);
    const body = validate(updateUserSchema, req.body);
    const user = await this.service.updateUser(id, body);
    res.status(200).json(user);
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(userIdParamSchema, req.params);
    await this.service.deleteUser(id);
    res.status(204).send();
  };

  getSkills = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(userIdParamSchema, req.params);
    const skills = await this.service.getSkills(id);
    res.status(200).json({ skills });
  };

  updateSkills = async (req: Request, res: Response): Promise<void> => {
    const { id } = validate(userIdParamSchema, req.params);
    const { skills } = validate(updateSkillsSchema, req.body);
    const updated = await this.service.replaceSkills(id, skills);
    res.status(200).json({ skills: updated });
  };
}
