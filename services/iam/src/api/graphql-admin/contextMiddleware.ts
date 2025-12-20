import type { FastifyReply, FastifyRequest } from "fastify";
import type { Repository } from "../../repositories/index.js";
import type { User } from "../../repositories/index.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: User | null;
  }
}

export interface ContextMiddlewareConfig {
  repository?: Repository | null;
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

/**
 * Build admin context middleware
 * Extracts JWT from Authorization header and fetches current user
 */
export function buildAdminContextMiddleware(config: ContextMiddlewareConfig) {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    request.currentUser = null;

    if (!config.repository) {
      return;
    }

    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      return;
    }

    const result = await config.repository.user.getCurrentUser(token);

    if (!result.success) {
      reply.code(401).send({ error: result.error || "Unauthorized" });
      return;
    }

    request.currentUser = result.user;
  };
}
