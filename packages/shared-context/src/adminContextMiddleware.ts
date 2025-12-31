import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type {
  ContextStore,
  ContextUser,
  GetCurrentUserResult,
  GetCurrentStoreResult,
} from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    store: ContextStore;
    user: ContextUser;
  }
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


  const interpolationHeader =
    request.headers["x-interpolation"] ?? request.headers["X-Interpolation"];
  return headerIsTrue(interpolationHeader);
}

export interface AdminContextMiddlewareOptions {
  /** Service name for logging */
  serviceName?: string;
}

/**
 * Build admin context middleware using broker calls.
 * Requires x-store-name and authorization headers for admin API.
 *
 * Sets request.store and request.user from:
 * - broker.call("iam.getCurrentUser", { accessToken })
 * - broker.call("project.getCurrentStore", { name })
 */
export function buildAdminContextMiddleware(
  broker: ServiceBroker,
  options: AdminContextMiddlewareOptions = {}
) {
  const serviceName = options.serviceName ?? "SERVICE";

  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (isGraphqlIntrospectionRequest(request)) {
      return;
    }

    const storeName = request.headers["x-store-name"] as string | undefined;
    const authorization = request.headers.authorization;

    if (!storeName) {
      return reply.status(400).send({
        data: null,
        errors: [{ message: "Missing x-store-name header" }],
      });
    }

    if (!authorization?.startsWith("Bearer ")) {
      return reply.status(401).send({
        data: null,
        errors: [{ message: "Missing or invalid authorization header" }],
      });
    }

    const accessToken = authorization.slice(7);

    try {
      // Parallel calls to IAM and Project services
      const [userResult, storeResult] = await Promise.all([
        broker.call<GetCurrentUserResult, { accessToken: string }>(
          "iam.getCurrentUser",
          { accessToken }
        ),
        broker.call<GetCurrentStoreResult, { name: string }>(
          "project.getCurrentStore",
          { name: storeName }
        ),
      ]);

      if (!userResult?.user) {
        return reply.status(401).send({
          data: null,
          errors: [
            { message: userResult?.userErrors?.[0]?.message || "Unauthorized" },
          ],
        });
      }

      if (!storeResult?.store) {
        return reply.status(404).send({
          data: null,
          errors: [
            {
              message:
                storeResult?.userErrors?.[0]?.message || "Store not found",
            },
          ],
        });
      }

      request.user = userResult.user;
      request.store = storeResult.store;
    } catch (error) {
      console.error(`[${serviceName}] Context loading failed:`, error);
      return reply.status(500).send({
        data: null,
        errors: [{ message: "Context loading failed" }],
      });
    }
  };
}
