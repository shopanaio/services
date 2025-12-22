import type { FastifyReply, FastifyRequest } from "fastify";
import type { Repository, User } from "../../repositories/index.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: User | null;
    /** Project slug from X-Project-Name header */
    projectSlug: string | null;
    /** Tenant ID derived from projectSlug (for RBAC) */
    tenantId: string | null;
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
 * Extract project slug from X-Project-Name header
 */
function extractProjectSlug(header: string | string[] | undefined): string | null {
  if (!header) return null;
  return Array.isArray(header) ? header[0] : header;
}

/**
 * Convert project slug to tenant ID for RBAC
 */
function projectSlugToTenantId(projectSlug: string): string {
  return projectSlug; // Now just use slug directly, no org- prefix needed
}

/**
 * Build admin context middleware.
 * Extracts session token from Authorization header and validates session via Better Auth.
 * Also extracts project context from X-Project-Name header.
 */
export function buildAdminContextMiddleware(config: ContextMiddlewareConfig) {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    request.currentUser = null;
    request.projectSlug = null;
    request.tenantId = null;

    // Extract project context from header
    const projectSlug = extractProjectSlug(request.headers["x-project-name"]);
    if (projectSlug) {
      request.projectSlug = projectSlug;
      request.tenantId = projectSlugToTenantId(projectSlug);
    }

    if (!config.repository) {
      return;
    }

    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
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
