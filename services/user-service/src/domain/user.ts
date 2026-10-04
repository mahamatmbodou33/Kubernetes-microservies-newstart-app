/** Domain model for a user. Field names are camelCase (API/domain); the DB uses snake_case. */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string | null;
  skills: string[];
  preferredJobType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  location?: string | null;
  skills?: string[];
  preferredJobType?: string | null;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: string | null;
  skills?: string[];
  preferredJobType?: string | null;
}
