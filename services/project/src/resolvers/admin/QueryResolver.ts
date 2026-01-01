import { ApolloQuery } from "@shopana/type-resolver";
import { BaseResolver } from "./BaseResolver.js";
import { StoreQueryResolver } from "./StoreQueryResolver.js";

/**
 * Root Query resolver.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends BaseResolver<Record<string, never>> {
  /**
   * Entry point for store-related queries.
   * Returns namespace resolver that handles all store queries.
   */
  storeQuery() {
    return new StoreQueryResolver({}, this.$ctx);
  }
}
