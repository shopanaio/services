import { ApolloMutation } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { AuthMutationResolver } from "./AuthMutationResolver.js";
import { UserMutationResolver } from "./UserMutationResolver.js";
import { RoleMutationResolver } from "./RoleMutationResolver.js";
import { OrganizationMutationResolver } from "./OrganizationMutationResolver.js";

/**
 * Root Mutation resolver.
 * Decorated with @ApolloMutation to create Apollo-compatible resolver proxy.
 */
@ApolloMutation
export class MutationResolver extends IAMType<Record<string, never>> {
  /**
   * Entry point for authentication mutations.
   * Returns namespace resolver that handles signUp, signIn, signOut, tokenRefresh.
   */
  authMutation() {
    return new AuthMutationResolver({}, this.$ctx);
  }

  /**
   * Entry point for user mutations.
   * Returns namespace resolver that handles user profile, email, password updates.
   */
  userMutation() {
    return new UserMutationResolver({}, this.$ctx);
  }

  /**
   * Entry point for role mutations.
   * Returns namespace resolver that handles role CRUD operations.
   */
  roleMutation() {
    return new RoleMutationResolver({}, this.$ctx);
  }

  /**
   * Entry point for organization mutations.
   * Returns namespace resolver that handles organization and member operations.
   */
  organizationMutation() {
    return new OrganizationMutationResolver({}, this.$ctx);
  }
}
