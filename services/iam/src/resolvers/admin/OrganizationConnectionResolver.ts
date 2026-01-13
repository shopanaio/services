import type { OrganizationRelayInput } from "../../repositories/organization/OrganizationRepository.js";
import { OrganizationResolver } from "./OrganizationResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type OrganizationConnectionResolverInput = OrganizationRelayInput;

/**
 * OrganizationConnection - resolves paginated organization list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class OrganizationConnectionResolver extends BaseConnectionResolver<OrganizationRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.organization.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new OrganizationResolver(nodeId, this.$ctx);
  }
}
