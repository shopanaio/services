import { ApolloMutation } from "@shopana/type-resolver";
import { CustomersType } from "./CustomersType.js";

@ApolloMutation
export class MutationResolver extends CustomersType<Record<string, never>> {
  async customersMutation() {
    return this.resolvers.customersMutation();
  }
}

export class CustomersMutationResolver extends CustomersType<
  Record<string, never>
> {
  async _empty() {
    return true;
  }
}
