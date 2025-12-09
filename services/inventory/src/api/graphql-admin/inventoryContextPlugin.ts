import type { ApolloServerPlugin } from "@apollo/server";
import { setViewContext } from "@shopana/type-executor";
import { setContext } from "../../context/index.js";
import { createViewContext } from "./resolvers/utils.js";
import type { GraphQLContext } from "./server.js";

/**
 * Apollo Server plugin that sets inventory context in AsyncLocalStorage
 * during GraphQL operation execution.
 *
 * This ensures context is available to all resolvers and business logic
 * through the getContext() function from AsyncLocalStorage.
 */
export function inventoryContextPlugin(): ApolloServerPlugin<GraphQLContext> {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          const { contextValue } = requestContext;
          const inventoryContext = contextValue._inventoryContext;

          // Skip for introspection queries (no context)
          if (!inventoryContext) {
            return;
          }

          // Set context in AsyncLocalStorage for all resolvers
          setContext(inventoryContext);

          // Set view context for type-executor Views
          if (contextValue.kernel) {
            const viewContext = createViewContext(contextValue.kernel);
            setViewContext(viewContext);
          }
        },
      };
    },
  };
}
