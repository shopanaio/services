import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerSegmentMembership } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerSegmentMembershipResolver extends CustomersType<
  string,
  CustomerSegmentMembership
> {
  async $preload() {
    const membership = await this.$ctx.loaders.segmentMembership.load(
      this.$props
    );
    if (!membership) {
      throw new PreloadNotFoundError(
        `Customer segment membership with ID ${this.$props} not found`
      );
    }
    return membership;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.CustomerSegmentMembership
    );
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  async segment() {
    return this.resolvers.segment(await this.$get("segmentId"));
  }

  source() {
    return this.$get("source");
  }

  evaluatedAt() {
    return this.$get("evaluatedAt");
  }

  expiresAt() {
    return this.$get("expiresAt");
  }

  async isActive() {
    const expiresAt = await this.$get("expiresAt");
    return expiresAt === null || new Date(expiresAt) > new Date();
  }
}
