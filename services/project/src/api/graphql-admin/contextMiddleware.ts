import type { FastifyReply, FastifyRequest } from "fastify";
import type { ContextProject, ContextUser } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { GetCurrentProjectScript } from "../../scripts/index.js";

interface IamCurrentUserResult {
  user: {
    id: string;
    owner: string;
    name: string;
    email?: string;
  } | null;
  userErrors: Array<{ code: string; message: string }>;
}

declare module "fastify" {
  interface FastifyRequest {
    project: ContextProject;
    user: ContextUser;
    accessToken?: string;
  }
}

export interface ContextMiddlewareConfig {
  // TODO: add config options
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
  const url = request.url;

  // Skip auth for health check and root endpoints
  if (url === "/" || url === "/healthz") {
    return true;
  }

  // Check for GraphQL introspection
  const isGraphqlPath = typeof url === "string" && url.startsWith("/graphql");
  if (!isGraphqlPath) return false;

  if (request.headers["user-agent"]?.includes("rover")) {
    return true;
  }

  const interpolationHeader =
    request.headers["x-interpolation"] ?? request.headers["X-Interpolation"];
  return headerIsTrue(interpolationHeader);
}

/**
 * Build admin context middleware
 * Authenticates user via IAM and validates project access
 */
export function buildAdminContextMiddleware(_config: ContextMiddlewareConfig) {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    console.log('[PROJECT contextMiddleware] URL:', request.url);
    console.log('[PROJECT contextMiddleware] Headers:', JSON.stringify(request.headers, null, 2));

    if (shouldSkipAuth(request)) {
      console.log('[PROJECT contextMiddleware] Skipping auth');
      return;
    }

    const kernel = Kernel.getInstance();
    const slug = request.headers["x-project-name"] as string | undefined;

    // Extract access token from Authorization header
    const authHeader = request.headers.authorization;
    console.log('[PROJECT contextMiddleware] Authorization header:', authHeader ? `${authHeader.slice(0, 30)}...` : 'MISSING');

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log('[PROJECT contextMiddleware] REJECTING - no auth header');
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: "Missing or invalid Authorization header" }] });
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer " prefix

    // 1. Always authenticate user via IAM
    const userResult = await kernel.getServices().broker.call(
      "iam.getCurrentUser",
      { accessToken }
    ) as IamCurrentUserResult;

    if (!userResult.user) {
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: userResult.userErrors[0]?.message || "Unauthorized" }] });
    }

    // Set user on request
    request.user = {
      id: userResult.user.id,
    };
    request.accessToken = accessToken;

    // 2. If no project slug provided, skip project validation (for project creation)
    if (!slug) {
      request.project = null as unknown as ContextProject;
      return;
    }

    // 3. Load project and validate access using user's owner (tenant)
    const result = await kernel.runScript(GetCurrentProjectScript, {
      userOwner: userResult.user.owner,
      slug,
    });

    if (result.userErrors.length > 0) {
      const error = result.userErrors[0];
      const statusCode = error.code === "ACCESS_DENIED" ? 403 :
                        error.code === "PROJECT_NOT_FOUND" ? 404 : 400;
      return reply
        .status(statusCode)
        .send({ data: null, errors: [{ message: error.message, code: error.code }] });
    }

    if (!result.project) {
      return reply
        .status(404)
        .send({ data: null, errors: [{ message: "Project not found" }] });
    }

    // Set project on request
    request.project = {
      id: result.project.id,
      slug: result.project.slug,
    };
  };
}
