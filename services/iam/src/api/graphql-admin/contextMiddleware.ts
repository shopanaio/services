import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Repository, User } from "../../repositories/index.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: User | null;
    /** Organization ID from JWT org claim */
    organizationId: string | null;
    /** Project slug from X-Project-Name header (for domain scoping) */
    projectSlug: string | null;
    /** Tenant ID (deprecated - use organizationId) */
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

/** Result type from project.getCurrentProject */
interface GetCurrentProjectResult {
  project?: {
    id: string;
    slug: string;
    organizationId?: string;
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
 * (Legacy support - will be deprecated)
 */
async function resolveProjectTenantId(
  broker: ServiceBroker,
  projectSlug: string
): Promise<{ tenantId: string | null; organizationId: string | null }> {
  try {
    const result = await broker.call<{ slug: string }, GetCurrentProjectResult>(
      "project.getCurrentProject",
      { slug: projectSlug }
    );

    if (result.userErrors.length > 0 || !result.project) {
      console.warn(`[IAM contextMiddleware] Failed to resolve project: ${projectSlug}`, result.userErrors);
      return { tenantId: null, organizationId: null };
    }

    const tenantId = result.project.integrations.iam?.config.tenantId ?? null;
    const organizationId = result.project.organizationId ?? null;

    if (!tenantId && !organizationId) {
      console.warn(`[IAM contextMiddleware] Project ${projectSlug} has no IAM integration`);
    }

    return { tenantId, organizationId };
  } catch (error) {
    console.error(`[IAM contextMiddleware] Error resolving project tenantId:`, error);
    return { tenantId: null, organizationId: null };
  }
}

/**
 * Build admin context middleware.
 * Extracts session token from Authorization header and validates session via Better Auth.
 * Extracts organizationId from JWT or falls back to X-Project-Name header resolution.
 */
export function buildAdminContextMiddleware(config: ContextMiddlewareConfig) {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    request.currentUser = null;
    request.organizationId = null;
    request.projectSlug = null;
    request.tenantId = null;

    const token = extractBearerToken(request.headers.authorization);

    // Try to extract organizationId from JWT first (new flow)
    if (token) {
      const jwtPayload = decodeJwtPayload(token);
      if (jwtPayload?.org) {
        request.organizationId = jwtPayload.org;
        console.log(`[IAM contextMiddleware] organizationId from JWT: ${request.organizationId}`);
      }
    }

    // Extract project context from header (for domain scoping)
    const projectSlug = extractProjectSlug(request.headers["x-project-name"]);
    if (projectSlug) {
      request.projectSlug = projectSlug;

      // If no organizationId from JWT, resolve from project service (legacy flow)
      if (!request.organizationId && config.broker) {
        const { tenantId, organizationId } = await resolveProjectTenantId(config.broker, projectSlug);
        request.tenantId = tenantId;
        if (organizationId) {
          request.organizationId = organizationId;
        }
        console.log(`[IAM contextMiddleware] Resolved from project: orgId=${request.organizationId}, tenantId=${request.tenantId}`);
      }
    }

    // Validate user session
    if (!config.repository) {
      return;
    }

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
