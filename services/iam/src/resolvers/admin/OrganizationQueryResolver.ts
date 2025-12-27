import { IAMType } from "./IAMType.js";
import { OrganizationResolver } from "./OrganizationResolver.js";

/**
 * OrganizationQuery namespace resolver.
 * Handles all organization-related queries.
 */
export class OrganizationQueryResolver extends IAMType<Record<string, never>> {
  /**
   * Get organization by ID.
   */
  organization(args: { id: string }) {
    return new OrganizationResolver(args.id, this.ctx);
  }
}
