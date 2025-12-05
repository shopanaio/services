import type { ApolloServerPlugin } from "@apollo/server";
import { setContext } from "../../context/index.js";
import type { GraphQLContext } from "./server.js";

/**
 * Apollo Server plugin that sets MediaContext in AsyncLocalStorage
 * for each request. This ensures getContext() works in all resolvers
 * and downstream code without manual wrapping.
 */
export function mediaContextPlugin(): ApolloServerPlugin<GraphQLContext> {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          const { contextValue } = requestContext;

          // Skip for introspection queries (no project/user)
          if (!contextValue.project || !contextValue.user) {
            return;
          }

          // Set context in AsyncLocalStorage for all resolvers
          setContext({
            slug: contextValue.slug,
            project: contextValue.project,
            user: contextValue.user,
          });
        },
      };
    },
  };
}
