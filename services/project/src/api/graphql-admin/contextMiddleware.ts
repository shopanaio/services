import type { FastifyReply, FastifyRequest } from "fastify";
import type { ContextUser } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";

interface IamCurrentUserResult {
  user: {
    id: string;
    name: string;
    email?: string;
  } | null;
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
    user: ContextUser;
    accessToken?: string;
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
 * Authenticates user via IAM and stores storeName from header.
 * Store loading is done lazily in currentStore query.
 */
export function buildAdminContextMiddleware() {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (shouldSkipAuth(request)) {
      return;
    }

    const kernel = Kernel.getInstance();

    // Store name from header (for lazy loading in currentStore query)
    request.storeName = request.headers["x-store-name"] as string | undefined;

    // Extract access token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        data: null,
        errors: [{ message: "Missing or invalid Authorization header" }],
      });
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer " prefix

    // Authenticate user via IAM
    const userResult = (await kernel
      .getServices()
      .broker.call("iam.getCurrentUser", {
        accessToken,
      })) as IamCurrentUserResult;

    if (!userResult.user) {
      return reply.status(401).send({
        data: null,
        errors: [
          { message: userResult.userErrors[0]?.message || "Unauthorized" },
        ],
      });
    }

    request.user = userResult.user;
    request.accessToken = accessToken;
  };
}
