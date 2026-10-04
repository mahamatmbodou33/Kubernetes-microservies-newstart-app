import type { Request, Response } from 'express';
import { validate } from '@newstart/shared-utils';
import type { ChecklistService } from '../services/checklist.service.js';
import {
  createChecklistSchema,
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
  userIdParamSchema,
} from '../schemas/task.schema.js';

export class ChecklistController {
  constructor(private readonly service: ChecklistService) {}

  createChecklist = async (req: Request, res: Response): Promise<void> => {
    const { userId, includeDefaults } = validate(createChecklistSchema, req.body);
    const result = await this.service.createChecklist(userId, includeDefaults);
    res.status(201).json(result);
  };

  listTasks = async (req: Request, res: Response): Promise<void> => {
    const { userId } = validate(userIdParamSchema, req.params);
    const { status, category, sort, page, limit } = validate(listTasksQuerySchema, req.query);
    const result = await this.service.listTasks(userId, { status, category }, sort, page, limit);
    res.status(200).json(result);
  };

  addTask = async (req: Request, res: Response): Promise<void> => {
    const { userId } = validate(userIdParamSchema, req.params);
    const body = validate(createTaskSchema, req.body);
    const task = await this.service.addTask(userId, body);
    res.status(201).json(task);
  };

  updateTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = validate(taskIdParamSchema, req.params);
    const body = validate(updateTaskSchema, req.body);
    const task = await this.service.updateTask(taskId, body);
    res.status(200).json(task);
  };

  deleteTask = async (req: Request, res: Response): Promise<void> => {
    const { taskId } = validate(taskIdParamSchema, req.params);
    await this.service.deleteTask(taskId);
    res.status(204).send();
  };
}
