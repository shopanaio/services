import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServiceBroker } from "@shopana/shared-kernel";
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
  broker?: ServiceBroker | null;
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

/** Result type from project.getCurrentProject */
interface GetCurrentProjectResult {
  project?: {
    id: string;
    slug: string;
    integrations: {
      iam?: {
        config: {
          tenantId: string;
        };
      };
    };
  };
  userErrors: Array<{ code: string; message: string }>;
}

/**
 * Resolve tenantId from project slug via broker call to project service
 */
async function resolveProjectTenantId(
  broker: ServiceBroker,
  projectSlug: string
): Promise<string | null> {
  try {
    const result = await broker.call<{ slug: string }, GetCurrentProjectResult>(
      "project.getCurrentProject",
      { slug: projectSlug }
    );

    if (result.userErrors.length > 0 || !result.project) {
      console.warn(`[IAM contextMiddleware] Failed to resolve project: ${projectSlug}`, result.userErrors);
      return null;
    }

    const tenantId = result.project.integrations.iam?.config.tenantId;
    if (!tenantId) {
      console.warn(`[IAM contextMiddleware] Project ${projectSlug} has no IAM integration`);
      return null;
    }

    return tenantId;
  } catch (error) {
    console.error(`[IAM contextMiddleware] Error resolving project tenantId:`, error);
    return null;
  }
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

    console.log(`[IAM contextMiddleware] URL: ${request.url}`);
    console.log(`[IAM contextMiddleware] x-project-name: ${request.headers["x-project-name"]}`);

    // Extract project context from header
    const projectSlug = extractProjectSlug(request.headers["x-project-name"]);
    if (projectSlug) {
      request.projectSlug = projectSlug;

      // Resolve tenantId from project service via broker
      if (config.broker) {
        request.tenantId = await resolveProjectTenantId(config.broker, projectSlug);
        console.log(`[IAM contextMiddleware] Resolved tenantId: ${request.tenantId}`);
      } else {
        console.warn(`[IAM contextMiddleware] No broker available to resolve tenantId`);
      }
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
