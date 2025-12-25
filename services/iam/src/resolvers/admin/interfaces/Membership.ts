import type { Role } from "./Role.js";
import type { Member } from "./Member.js";
import type { ResourceDefinition } from "./ResourceDefinition.js";

/**
 * Membership - container for members and roles within a domain
 */
export interface Membership {
  domain: string;
  roles: Role[];
  members: Member[];
  availableResources: ResourceDefinition[] | null;
}
