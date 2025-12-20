import type { FastifyReply, FastifyRequest } from "fastify";
import type { ContextProject, ContextUser } from "../../context/index.js";
import { Kernel } from "../../kernel/Kernel.js";
import { GetCurrentProjectScript } from "../../scripts/index.js";

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
 * Checks if request is a GraphQL introspection query
 */
function isGraphqlIntrospectionRequest(request: FastifyRequest): boolean {
  const isGraphqlPath =
    typeof request.url === "string" && request.url.startsWith("/graphql");
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
    if (isGraphqlIntrospectionRequest(request)) {
      return;
    }

    const kernel = Kernel.getInstance();
    const slug = request.headers["x-project-name"] as string;

    if (!slug) {
      return reply
        .status(400)
        .send({ data: null, errors: [{ message: "Missing x-project-name header" }] });
    }

    // Extract access token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: "Missing or invalid Authorization header" }] });
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer " prefix

    // Call getCurrentProject script which validates user and project access
    const result = await kernel.runScript(GetCurrentProjectScript, {
      accessToken,
      slug,
    });

    if (result.userErrors.length > 0) {
      const error = result.userErrors[0];
      const statusCode = error.code === "UNAUTHORIZED" ? 401 :
                        error.code === "ACCESS_DENIED" ? 403 :
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

    // Set project and user on request for use in GraphQL context
    request.project = {
      id: result.project.id,
      slug: result.project.slug,
    };
    request.user = {
      id: "", // User ID can be added if needed from IAM response
    };
    request.accessToken = accessToken;
  };
}
