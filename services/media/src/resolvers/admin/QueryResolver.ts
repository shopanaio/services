import { ApolloQuery } from "@shopana/type-resolver";
import { MediaType } from "./MediaType.js";
import { MediaQueryResolver } from "./MediaQueryResolver.js";

/**
 * Root Query resolver.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends MediaType<Record<string, never>> {
  /**
   * Entry point for media-related queries.
   * Returns namespace resolver that handles all media queries.
   */
  mediaQuery() {
    return new MediaQueryResolver({}, this.ctx);
  }
}
