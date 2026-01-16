import type { FastifyRequest } from "fastify";
import {
  buildAdminContextMiddleware as buildMiddleware,
  type ContextStore,
  type ContextUser,
} from "@shopana/shared-context";
import { Kernel } from "../../kernel/Kernel.js";

// Module augmentation for Fastify
declare module "fastify" {
  interface FastifyRequest {
    store?: ContextStore;
    user: ContextUser;
  }
}

/**
 * Build admin context middleware with async local storage support
 * Gets broker from Kernel singleton
 */
export function buildAdminContextMiddleware() {
  const kernel = Kernel.getInstance();
  return buildMiddleware(kernel.getServices().broker, {
    serviceName: "MEDIA",
    requireStore: false,
  });
}
