import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerTagAssignment } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerTagAssignmentResolver extends CustomersType<
  string,
  CustomerTagAssignment
> {
  async $preload() {
    const assignment = await this.$ctx.loaders.tagAssignment.load(this.$props);
    if (!assignment) {
      throw new PreloadNotFoundError(
        `Customer tag assignment with ID ${this.$props} not found`
      );
    }
    return assignment;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerTagAssignment);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  async tag() {
    return this.resolvers.tag(await this.$get("tagId"));
  }

  assignedById() {
    return this.$get("assignedById");
  }

  assignedAt() {
    return this.$get("assignedAt");
  }
}
