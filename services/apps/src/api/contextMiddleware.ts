import type { FastifyRequest, FastifyReply } from "fastify";
import type { ServiceBroker } from "moleculer";
import { type CoreCustomer, type CoreProject, type FetchContextHeaders } from "@shopana/platform-api";

declare module "fastify" {
  interface FastifyRequest {
    project: CoreProject;
    customer: CoreCustomer | null;
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

export function buildCoreContextMiddleware(broker: ServiceBroker) {
  return async function coreContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (isGraphqlIntrospectionRequest(request)) {
      return;
    }

    try {
      const ctx = await broker.call<any, FetchContextHeaders>('platform.context', request.headers);
      if (!ctx) {
        return reply
          .status(401)
          .send({ data: null, errors: [{ message: "Unauthorized" }] });
      }

      request.project = ctx.project!;
      request.customer = ctx.customer || null;
    } catch (error) {
      console.error('Failed to fetch context via broker:', error);
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: "Unauthorized" }] });
    }
  };
}
