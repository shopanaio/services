import { ApolloQuery } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { UserQueryResolver } from "./UserQueryResolver.js";
import { OrganizationQueryResolver } from "./OrganizationQueryResolver.js";

/**
 * Root Query resolver.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends IAMType<Record<string, never>> {
  /**
   * Entry point for user-related queries.
   * Returns namespace resolver that handles all user queries.
   */
  userQuery() {
    return new UserQueryResolver({}, this.$ctx);
  }

  /**
   * Entry point for organization-related queries.
   * Returns namespace resolver that handles all organization queries.
   */
  organizationQuery() {
    return new OrganizationQueryResolver({}, this.$ctx);
  }
}
