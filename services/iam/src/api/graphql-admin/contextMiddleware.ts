import type { FastifyReply, FastifyRequest } from "fastify";
import type { Repository, User } from "../../repositories/index.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: User | null;
    /** Organization ID from JWT org claim */
    organizationId: string | null;
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
 * Decode JWT payload without verification (verification done by Better Auth)
 * Used to extract organizationId claim
 */
function decodeJwtPayload(token: string): { org?: string; sub?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Build admin context middleware.
 * Extracts session token from Authorization header and validates session via Better Auth.
 * Extracts organizationId from JWT org claim.
 *
 * NOTE: organizationId MUST be in JWT. Use switchOrganization mutation to set it.
 */
export function buildAdminContextMiddleware(config: ContextMiddlewareConfig) {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
  ) {
    request.currentUser = null;
    request.organizationId = null;

    const token = extractBearerToken(request.headers.authorization);

    // Extract organizationId from JWT (required for multi-org support)
    if (token) {
      const jwtPayload = decodeJwtPayload(token);
      if (jwtPayload?.org) {
        request.organizationId = jwtPayload.org;
      }
    }

    // Validate user session
    if (!config.repository || !token) {
      return;
    }

    // Validate session token via Better Auth
    const result = await config.repository.user.getCurrentUser(token);

    if (!result.success) {
      // Don't fail request - just leave user as null
      // GraphQL resolvers can handle auth requirements
      return;
    }

    request.currentUser = result.user;
  };
}
