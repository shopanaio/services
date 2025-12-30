import {
  buildAdminContextMiddleware as buildMiddleware,
  type ContextStore,
  type ContextUser,
} from "@shopana/shared-context";
import { Kernel } from "../../kernel/Kernel.js";

export type { ContextStore, ContextUser };

// Module augmentation for Fastify
declare module "fastify" {
  interface FastifyRequest {
    store: ContextStore;
    user: ContextUser;
  }
}

export interface ContextMiddlewareConfig {
  repository?: unknown | null;
}

/**
 * Build admin context middleware
 * Gets broker from Kernel singleton
 */
export function buildAdminContextMiddleware(_config: ContextMiddlewareConfig) {
  const kernel = Kernel.getInstance();
  return buildMiddleware(kernel.getServices().broker, { serviceName: "INVENTORY" });
}
