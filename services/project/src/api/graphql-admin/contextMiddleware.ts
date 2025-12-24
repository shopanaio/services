import type { FastifyReply, FastifyRequest } from "fastify";
import type { ContextStore, ContextUser } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { GetCurrentStoreScript } from "../../scripts/index.js";

interface IamCurrentUserResult {
  user: {
    id: string;
    name: string;
    email?: string;
  } | null;
  userErrors: Array<{ code: string; message: string }>;
}

interface IamGetUserRoleResult {
  role: string | null;
  permissions: string[];
  userErrors: Array<{ code: string; message: string }>;
}

export class ForbiddenError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

declare module "fastify" {
  interface FastifyRequest {
    store: ContextStore;
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
 * Authenticates user via IAM and validates store access
 */
export function buildAdminContextMiddleware(_config: ContextMiddlewareConfig) {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    console.log('[STORE contextMiddleware] URL:', request.url);
    console.log('[STORE contextMiddleware] Headers:', JSON.stringify(request.headers, null, 2));

    if (shouldSkipAuth(request)) {
      console.log('[STORE contextMiddleware] Skipping auth');
      return;
    }

    const kernel = Kernel.getInstance();
    const slug = request.headers["x-store-name"] as string | undefined;

    // Extract access token from Authorization header
    const authHeader = request.headers.authorization;
    console.log('[STORE contextMiddleware] Authorization header:', authHeader ? `${authHeader.slice(0, 30)}...` : 'MISSING');

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log('[STORE contextMiddleware] REJECTING - no auth header');
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: "Missing or invalid Authorization header" }] });
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer " prefix

    // 1. Always authenticate user via IAM
    console.log('[STORE contextMiddleware] Calling iam.getCurrentUser with token:', accessToken.slice(0, 20) + '...');
    const userResult = await kernel.getServices().broker.call(
      "iam.getCurrentUser",
      { accessToken }
    ) as IamCurrentUserResult;

    console.log('[STORE contextMiddleware] iam.getCurrentUser result:', JSON.stringify(userResult, null, 2));

    if (!userResult.user) {
      console.log('[STORE contextMiddleware] REJECTING - no user from IAM');
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: userResult.userErrors[0]?.message || "Unauthorized" }] });
    }

    // Set user on request
    request.user = {
      id: userResult.user.id,
    };
    request.accessToken = accessToken;

    // 2. If no store slug provided, skip store validation (for store creation)
    if (!slug) {
      request.store = null as unknown as ContextStore;
      return;
    }

    // 3. Load store by slug
    const result = await kernel.runScript(GetCurrentStoreScript, {
      slug,
    });

    if (result.userErrors.length > 0) {
      const error = result.userErrors[0];
      const statusCode = error.code === "ACCESS_DENIED" ? 403 :
                        error.code === "STORE_NOT_FOUND" ? 404 : 400;
      return reply
        .status(statusCode)
        .send({ data: null, errors: [{ message: error.message, code: error.code }] });
    }

    if (!result.store || !result.store.integrations.iam) {
      return reply
        .status(404)
        .send({ data: null, errors: [{ message: "Store not found" }] });
    }

    const organizationId = result.store.integrations.iam.config.organizationId;

    // 4. Check user has role in this store via IAM
    const roleResult = await kernel.getServices().broker.call(
      "iam.getUserRole",
      { userId: userResult.user.id, organizationId }
    ) as IamGetUserRoleResult;

    if (!roleResult.role) {
      throw new ForbiddenError("Access denied to this store");
    }

    // Set full store on request with organizationId shortcut
    request.store = {
      ...result.store,
      organizationId,
    };
  };
}
