import { ApolloQuery } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { DiscountConnectionInput } from "../../repositories/DiscountRepository.js";
import { DiscountConnectionResolver } from "./DiscountConnectionResolver.js";
import { PricingType } from "./PricingType.js";

@ApolloQuery
export class QueryResolver extends PricingType<Record<string, never>> {
  pricingQuery() {
    return this.resolvers.pricingQuery();
  }
}

export class PricingQueryResolver extends PricingType<Record<string, never>> {
  discount(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.Discount);
    return this.resolvers.discount(id);
  }

  discounts(args: DiscountConnectionInput) {
    return new DiscountConnectionResolver(args, this.$ctx);
  }
}
