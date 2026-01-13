import type { OrganizationRelayInput } from "../../repositories/organization/OrganizationRepository.js";
import { OrganizationResolver } from "./OrganizationResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type OrganizationConnectionResolverInput = OrganizationRelayInput & {
  /** Current user ID - required to filter organizations by membership */
  userId: string;
};

/**
 * OrganizationConnection - resolves paginated organization list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class OrganizationConnectionResolver extends BaseConnectionResolver<OrganizationConnectionResolverInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.organization.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new OrganizationResolver(nodeId, this.$ctx);
  }
}
