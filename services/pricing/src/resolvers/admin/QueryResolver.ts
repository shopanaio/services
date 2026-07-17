import { ApolloQuery } from "@shopana/type-resolver";
import { PricingType } from "./PricingType.js";

@ApolloQuery
export class QueryResolver extends PricingType<Record<string, never>> {
  pricingQuery() {
    return this.resolvers.pricingQuery();
  }
}

export class PricingQueryResolver extends PricingType<Record<string, never>> {
  _placeholder(): boolean {
    return true;
  }
}
