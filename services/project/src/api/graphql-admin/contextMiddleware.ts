import type { FastifyReply, FastifyRequest } from "fastify";
import {
  buildAdminContextMiddleware as buildMiddleware,
  type AdminContextClaims,
  type ContextUser,
} from "@shopana/shared-context";

export class ForbiddenError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user: ContextUser;
    adminContext?: AdminContextClaims;
    /** Store slug from X-Store-Name header */
    storeName?: string;
  }
}

function headerIsTrue(value: unknown): boolean {
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "boolean") return value === true;
  return false;
}

/**
 * Checks if request should skip authentication (health checks, introspection)
 */
function shouldSkipAuth(request: FastifyRequest): boolean {
  const interpolationHeader =
    request.headers["x-interpolation"] ?? request.headers["X-Interpolation"];
  return headerIsTrue(interpolationHeader);
}

/**
 * Build admin context middleware.
 * Verifies the gateway-issued JWT and derives storeName from trusted claims.
 */
export function buildAdminContextMiddleware() {
  const middleware = buildMiddleware(undefined, {
    serviceName: "PROJECT",
    requireStore: false,
  });

  return async function adminContextMiddleware(request: FastifyRequest, reply: FastifyReply) {
    if (shouldSkipAuth(request)) return;

    await middleware(request, reply);
    if (reply.sent) return;

    request.storeName = request.adminContext?.store?.name;
  };
}
