import { ApolloMutation } from "@shopana/type-resolver";
import { MediaType } from "./MediaType.js";
import { MediaMutationResolver } from "./MediaMutationResolver.js";

/**
 * Root Mutation resolver.
 * Decorated with @ApolloMutation to create Apollo-compatible resolver proxy.
 */
@ApolloMutation
export class MutationResolver extends MediaType<Record<string, never>> {
  /**
   * Entry point for media-related mutations.
   * Returns namespace resolver that handles all media mutations.
   */
  mediaMutation() {
    return new MediaMutationResolver({}, this.ctx);
  }
}
