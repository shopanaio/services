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

/**
 * Build admin context middleware
 * Gets broker from Kernel singleton
 */
export function buildAdminContextMiddleware() {
  return buildMiddleware(Kernel.getInstance().getServices().broker, {
    serviceName: "INVENTORY",
  });
}
