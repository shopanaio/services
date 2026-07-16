import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerGroup } from "../../repositories/models/index.js";
import type { CustomerGroupMembershipRelayInput } from "../../repositories/classification/CustomerGroupRepository.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerGroupResolver extends CustomersType<string, CustomerGroup> {
  async $preload() {
    const group = await this.$ctx.loaders.group.load(this.$props);
    if (!group) {
      throw new PreloadNotFoundError(
        `Customer group with ID ${this.$props} not found`
      );
    }
    return group;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerGroup);
  }

  code() {
    return this.$get("code");
  }

  name() {
    return this.$get("name");
  }

  description() {
    return this.$get("description");
  }

  isDefault() {
    return this.$get("isDefault");
  }

  isActive() {
    return this.$get("isActive");
  }

  revision() {
    return this.$get("revision");
  }

  customersCount() {
    return this.$ctx.loaders.groupCustomersCount.load(this.$props);
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

  customerMemberships(args: CustomerGroupMembershipRelayInput) {
    return this.resolvers.groupMembershipConnection({
      ...args,
      groupId: this.$props,
    });
  }
}
