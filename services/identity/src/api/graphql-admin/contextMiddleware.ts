import type { FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@zaytra/casdoor-node-client-ext";
import type { CasdoorAdapter } from "../../adapters/casdoor/CasdoorAdapter.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: User | null;
  }
}

export interface ContextMiddlewareOptions {
  casdoorAdapter: CasdoorAdapter | null;
}

export function buildAdminContextMiddleware(options: ContextMiddlewareOptions) {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
  ) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      request.currentUser = null;
      return;
    }

    const token = authHeader.slice(7);

    if (!options.casdoorAdapter) {
      request.currentUser = null;
      return;
    }

    try {
      const result = await options.casdoorAdapter.getCurrentUser(token);

      if (result.success && result.user) {
        request.currentUser = result.user;
      } else {
        request.currentUser = null;
      }
    } catch (error) {
      console.error("[IDENTITY] Failed to get current user:", error);
      request.currentUser = null;
    }
  };
}
