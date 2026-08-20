import { ApolloQuery } from "@shopana/type-resolver";
import type { QueryProductsArgs, QuerySearchProductsArgs } from "./generated/types.js";
import { ListingType } from "./ListingType.js";
import { globalProductsInput, searchProductsInput } from "./ListingQueryTypes.js";

@ApolloQuery
export class QueryResolver extends ListingType<Record<string, never>> {
  products(args: QueryProductsArgs) {
    return this.resolvers.productConnection(globalProductsInput(args));
  }

  searchProducts(args: QuerySearchProductsArgs) {
    return this.resolvers.productConnection(searchProductsInput(args));
  }
}
