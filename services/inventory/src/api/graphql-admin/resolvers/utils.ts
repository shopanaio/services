import type { GraphQLContext } from "../server.js";
import type { Kernel } from "../../../kernel/Kernel.js";

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
