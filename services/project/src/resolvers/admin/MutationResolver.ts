import { ApolloMutation } from "@shopana/type-resolver";
import { BaseResolver } from "./BaseResolver.js";
import { StoreMutationResolver } from "./StoreMutationResolver.js";

/**
 * Root Mutation resolver.
 * Decorated with @ApolloMutation to create Apollo-compatible resolver proxy.
 */
@ApolloMutation
export class MutationResolver extends BaseResolver<Record<string, never>> {
  /**
   * Entry point for store-related mutations.
   * Returns namespace resolver that handles all store mutations.
   */
  storeMutation() {
    return new StoreMutationResolver({}, this.$ctx);
  }
}
