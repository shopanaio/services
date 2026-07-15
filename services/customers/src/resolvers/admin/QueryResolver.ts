import { ApolloQuery } from "@shopana/type-resolver";
import { CustomersType } from "./CustomersType.js";

@ApolloQuery
export class QueryResolver extends CustomersType<Record<string, never>> {
  async customersQuery() {
    return this.resolvers.customersQuery();
  }
}

export class CustomersQueryResolver extends CustomersType<Record<string, never>> {
  async _empty() {
    return true;
  }
}
