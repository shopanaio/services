import type { GraphQLContext } from "../server.js";
import type { Kernel } from "../../../kernel/Kernel.js";
import type { ViewContext } from "../../../views/admin/index.js";
import { getContext } from "../../../context/index.js";

const NO_DATABASE_ERROR = { message: "Database not configured", code: "NO_DATABASE" } as const;

export function noDatabaseError<T extends Record<string, unknown>>(nullFields: T) {
  return { ...nullFields, userErrors: [NO_DATABASE_ERROR] };
}

export function requireKernel(ctx: GraphQLContext): Kernel {
  if (!ctx.kernel) {
    throw new NoDatabaseError();
  }
  return ctx.kernel;
}

export class NoDatabaseError extends Error {
  constructor() {
    super("Database not configured");
    this.name = "NoDatabaseError";
  }
}

/**
 * Create ViewContext for resolving Views
 */
export function createViewContext(kernel: Kernel, currency?: string): ViewContext {
  const services = kernel.getServices();
  return {
    loaders: services.repository.loaderFactory.createLoaders(),
    queries: services.repository.queryFactory.createQueries(),
    locale: getContext().locale ?? "uk",
    currency,
  };
}
