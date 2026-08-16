import { ApolloQuery } from "@shopana/type-resolver";
import { StorefrontCustomersType } from "./StorefrontCustomersType.js";

@ApolloQuery
export class QueryResolver extends StorefrontCustomersType<Record<string, never>> {
  async customer() {
    this.requireReadPermission();
    const customerId = this.$ctx.customer?.id;
    if (!customerId) return null;
    const customer = await this.$ctx.loaders.customer.load(customerId);
    return customer?.lifecycleStatus === "ACTIVE"
      ? this.resolvers.customer(customerId)
      : null;
  }
}
