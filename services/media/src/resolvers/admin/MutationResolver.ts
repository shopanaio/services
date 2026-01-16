import { ApolloMutation } from "@shopana/type-resolver";
import { MediaType } from "./MediaType.js";
import { MediaMutationResolver } from "./MediaMutationResolver.js";
import { UserMutationResolver } from "./UserMutationResolver.js";
import { OrganizationMutationResolver } from "./OrganizationMutationResolver.js";

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
    return new MediaMutationResolver({}, this.$ctx);
  }

  /**
   * Federation extension for UserMutation.
   * Returns resolver that handles user avatar upload.
   */
  userMutation() {
    return new UserMutationResolver({}, this.$ctx);
  }

  /**
   * Federation extension for OrganizationMutation.
   * Returns resolver that handles organization logo upload.
   */
  organizationMutation() {
    return new OrganizationMutationResolver({}, this.$ctx);
  }
}
