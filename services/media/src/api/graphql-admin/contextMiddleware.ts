import type { FastifyRequest } from "fastify";
import {
  buildAdminContextMiddleware as buildMiddleware,
  type ContextStore,
  type ContextUser,
} from "@shopana/shared-context";
import { setContext } from "../../context/index.js";
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
 * Build admin context middleware with async local storage support
 * Gets broker from Kernel singleton
 */
export function buildAdminContextMiddleware(_config: ContextMiddlewareConfig) {
  const kernel = Kernel.getInstance();
  const middleware = buildMiddleware(kernel.getServices().broker, { serviceName: "MEDIA" });

  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: any
  ) {
    await middleware(request, reply);

    // Set context in async local storage after middleware runs
    if (request.store && request.user) {
      setContext({
        slug: request.headers["x-store-name"] as string,
        store: request.store as any,
        user: request.user as any,
      });
    }
  };
}
