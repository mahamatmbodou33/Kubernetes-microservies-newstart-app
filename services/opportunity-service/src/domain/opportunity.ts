export const OPPORTUNITY_TYPES = [
  'JOB',
  'TRAINING',
  'COMMUNITY',
  'EVENT',
  'RESOURCE',
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

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

/** An opportunity annotated with a match score for a specific user. */
export interface ScoredOpportunity extends Opportunity {
  matchScore: number;
  matchedSkills: string[];
}

export interface CreateOpportunityInput {
  title: string;
  description?: string | null;
  type: OpportunityType;
  organization?: string | null;
  location?: string | null;
  remote?: boolean;
  skills?: string[];
  url?: string | null;
}

export type UpdateOpportunityInput = Partial<CreateOpportunityInput>;

export interface OpportunityFilter {
  location?: string;
  skill?: string;
  type?: OpportunityType;
  remote?: boolean;
}
