import { ApolloMutation } from "@shopana/type-resolver";
import { PricingType } from "./PricingType.js";

@ApolloMutation
export class MutationResolver extends PricingType<Record<string, never>> {
  pricingMutation() {
    return this.resolvers.pricingMutation();
  }
}

export class PricingMutationResolver extends PricingType<Record<string, never>> {
  _placeholder(): boolean {
    return true;
  }
}
