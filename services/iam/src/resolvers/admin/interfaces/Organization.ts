import type { Membership } from './Membership.js';

/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain stores.
 */
export interface Organization {
  /** Unique identifier */
  id: string;

  /** Organization name (e.g., "Acme Corp") */
  name: string;

  /** URL-friendly unique identifier */
  slug: string;

  /** Membership info (members + roles). Domain = orgId */
  membership: Membership;

  /** Timestamp when the organization was created */
  createdAt: Date;

  /** Timestamp when the organization was last updated */
  updatedAt: Date | null;
}
