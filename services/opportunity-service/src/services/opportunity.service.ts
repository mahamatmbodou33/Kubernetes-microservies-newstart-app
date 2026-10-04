import { NotFoundError } from '@newstart/shared-utils';
import { buildPageMeta, type PaginatedResult } from '@newstart/shared-types';
import { createEvent, type MessagePublisher } from '@newstart/shared-events';
import type {
  CreateOpportunityInput,
  Opportunity,
  OpportunityFilter,
  ScoredOpportunity,
  UpdateOpportunityInput,
} from '../domain/opportunity.js';
import type { OpportunityRepository } from '../repositories/opportunity.repository.js';
import type { UserClient } from '../clients/user.client.js';
import { computeMatch } from './matching.js';

export class OpportunityService {
  constructor(
    private readonly repo: OpportunityRepository,
    private readonly userClient: UserClient,
    private readonly publisher: MessagePublisher,
  ) {}

  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    return this.repo.create(input);
  }

  async getById(id: string): Promise<Opportunity> {
    const opportunity = await this.repo.findById(id);
    if (!opportunity) {
      throw new NotFoundError(`Opportunity ${id} was not found`);
    }
    return opportunity;
  }

  async list(
    filter: OpportunityFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Opportunity>> {
    const { items, total } = await this.repo.list(filter, page, limit);
    return { data: items, meta: buildPageMeta(total, page, limit) };
  }

  async update(id: string, input: UpdateOpportunityInput): Promise<Opportunity> {
    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError(`Opportunity ${id} was not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Opportunity ${id} was not found`);
    }
  }

  /**
   * Recommend opportunities for a user by fetching their skills from the User
   * Service and scoring every opportunity. Returns matches (score > 0) sorted by
   * descending score. Throws NotFound if the user does not exist.
   */
  async recommendForUser(
    userId: string,
    limit: number,
    requestId?: string,
  ): Promise<ScoredOpportunity[]> {
    const skills = await this.userClient.getUserSkills(userId, requestId);
    if (skills === null) {
      throw new NotFoundError(`User ${userId} was not found`);
    }

    const opportunities = await this.repo.findAll();
    const scored: ScoredOpportunity[] = opportunities
      .map((opp) => {
        const { score, matchedSkills } = computeMatch(skills, opp.skills);
        return { ...opp, matchScore: score, matchedSkills };
      })
      .filter((opp) => opp.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return scored.slice(0, limit);
  }

  /** Save an opportunity for a user and publish OPPORTUNITY_SAVED on the first save. */
  async saveOpportunity(userId: string, opportunityId: string): Promise<Opportunity> {
    const opportunity = await this.getById(opportunityId); // 404 if it does not exist
    const newlySaved = await this.repo.saveOpportunity(userId, opportunityId);

    if (newlySaved) {
      await this.publisher.publish(
        createEvent('OPPORTUNITY_SAVED', 'opportunity-service', {
          opportunityId,
          userId,
          title: opportunity.title,
        }),
      );
    }
    return opportunity;
  }

  async unsaveOpportunity(userId: string, opportunityId: string): Promise<void> {
    const removed = await this.repo.unsaveOpportunity(userId, opportunityId);
    if (!removed) {
      throw new NotFoundError(`Saved opportunity not found for user ${userId}`);
    }
  }

  async listSaved(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Opportunity>> {
    const { items, total } = await this.repo.listSaved(userId, page, limit);
    return { data: items, meta: buildPageMeta(total, page, limit) };
  }
}
