import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerGroupMembership } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerGroupMembershipResolver extends CustomersType<
  string,
  CustomerGroupMembership
> {
  async $preload() {
    const membership = await this.$ctx.loaders.groupMembership.load(this.$props);
    if (!membership) {
      throw new PreloadNotFoundError(`Customer group membership with ID ${this.$props} not found`);
    }
    return membership;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerGroupMembership);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  async group() {
    return this.resolvers.group(await this.$get("groupId"));
  }

  isPrimary() {
    return this.$get("isPrimary");
  }

  source() {
    return this.$get("source");
  }

  assignedById() {
    return this.$get("assignedById");
  }

  assignedAt() {
    return this.$get("assignedAt");
  }

  expiresAt() {
    return this.$get("expiresAt");
  }

  async isActive() {
    const expiresAt = await this.$get("expiresAt");
    return expiresAt === null || new Date(expiresAt) > new Date();
  }
}
