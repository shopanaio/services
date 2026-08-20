import { AsyncLocalStorage } from "node:async_hooks";
import type { GraphQLContext } from "./context.js";

const storage = new AsyncLocalStorage<GraphQLContext>();

export function setAdminGraphQLContext(context: GraphQLContext): void {
  storage.enterWith(context);
}

export function getAdminGraphQLContext(): GraphQLContext {
  const context = storage.getStore();
  if (!context) throw new Error("Orders Admin GraphQL context is not available");
  return context;
}
