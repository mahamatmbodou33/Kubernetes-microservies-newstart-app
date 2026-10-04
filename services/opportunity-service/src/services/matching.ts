/**
 * Deterministic skill-matching (no AI).
 *
 *   match score = round( matchedSkills / requiredSkills * 100 )
 *
 * Matching is case-insensitive. An opportunity that requires no skills is treated
 * as a 100% match (it is open to everyone).
 */
export interface MatchResult {
  score: number;
  matchedSkills: string[];
}

export function computeMatch(userSkills: string[], requiredSkills: string[]): MatchResult {
  if (requiredSkills.length === 0) {
    return { score: 100, matchedSkills: [] };
  }

  const userSet = new Set(userSkills.map((s) => s.trim().toLowerCase()));
  const matchedSkills: string[] = [];

  for (const required of requiredSkills) {
    if (userSet.has(required.trim().toLowerCase())) {
      matchedSkills.push(required);
    }
  }

  const score = Math.round((matchedSkills.length / requiredSkills.length) * 100);
  return { score, matchedSkills };
}
