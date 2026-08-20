import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerSegment } from "../../repositories/models/index.js";
import type { CustomerSegmentMembershipRelayInput } from "../../repositories/classification/CustomerSegmentRepository.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerSegmentResolver extends CustomersType<string, CustomerSegment> {
  async $preload() {
    const segment = await this.$ctx.loaders.segment.load(this.$props);
    if (!segment) {
      throw new PreloadNotFoundError(`Customer segment with ID ${this.$props} not found`);
    }
    return segment;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerSegment);
  }

  name() {
    return this.$get("name");
  }

  description() {
    return this.$get("description");
  }

  color() {
    return this.$get("color");
  }

  type() {
    return this.$get("type");
  }

  status() {
    return this.$get("status");
  }

  query() {
    return this.$get("query");
  }

  definition() {
    return this.$get("definition");
  }

  definitionRevision() {
    return this.$get("definitionRevision");
  }

  evaluationGeneration() {
    return this.$get("evaluationGeneration");
  }

  materializationStatus() {
    return this.$get("materializationStatus");
  }

  createdById() {
    return this.$get("createdById");
  }

  revision() {
    return this.$get("revision");
  }

  customersCount() {
    return this.$ctx.loaders.segmentCustomersCount.load(this.$props);
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }

  deletedAt() {
    return this.$get("deletedAt");
  }

  customerMemberships(args: CustomerSegmentMembershipRelayInput) {
    return this.resolvers.segmentMembershipConnection({
      ...args,
      segmentId: this.$props,
    });
  }
}
