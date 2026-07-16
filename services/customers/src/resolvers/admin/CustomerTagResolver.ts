import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerTag } from "../../repositories/models/index.js";
import type { CustomerTagAssignmentRelayInput } from "../../repositories/classification/CustomerTagRepository.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerTagResolver extends CustomersType<string, CustomerTag> {
  async $preload() {
    const tag = await this.$ctx.loaders.tag.load(this.$props);
    if (!tag) {
      throw new PreloadNotFoundError(
        `Customer tag with ID ${this.$props} not found`
      );
    }
    return tag;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerTag);
  }

  name() {
    return this.$get("name");
  }

  normalizedName() {
    return this.$get("normalizedName");
  }

  customersCount() {
    return this.$ctx.loaders.tagCustomersCount.load(this.$props);
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

  customerAssignments(args: CustomerTagAssignmentRelayInput) {
    return this.resolvers.tagAssignmentConnection({
      ...args,
      tagId: this.$props,
    });
  }
}
