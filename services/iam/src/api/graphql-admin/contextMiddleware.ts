import type { FastifyReply, FastifyRequest } from "fastify";
import type { Repository } from "../../repositories/index.js";
import type { User } from "../../repositories/index.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: User | null;
    /** Project slug from X-Project-Name header */
    projectSlug: string | null;
    /** Tenant ID (Casdoor org name) derived from projectSlug */
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
 * Convert project slug to tenant org name (Casdoor organization)
 */
function projectSlugToTenantId(projectSlug: string): string {
  return `org-${projectSlug}`;
}

/**
 * Build admin context middleware
 * Extracts JWT from Authorization header and fetches current user
 * Also extracts project context from X-Project-Name header
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

    const result = await config.repository.user.getCurrentUser(token);

    if (!result.success) {
      reply.code(401).send({ error: result.error || "Unauthorized" });
      return;
    }

    request.currentUser = result.user;
  };
}
