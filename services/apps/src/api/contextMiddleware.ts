import type { FastifyRequest, FastifyReply } from "fastify";
import { type CoreCustomer, type CoreProject, type FetchContextHeaders, createCoreContextClient, type GrpcConfigPort } from "@shopana/platform-api";

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

/**
 * Build core context middleware using gRPC client
 */
export function buildCoreContextMiddleware(grpcConfig: GrpcConfigPort) {
  const contextClient = createCoreContextClient({ config: grpcConfig });

  return async function coreContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (isGraphqlIntrospectionRequest(request)) {
      return;
    }

    try {
      const headers: FetchContextHeaders = {
        authorization: request.headers.authorization,
        "x-api-key": request.headers["x-api-key"] as string | undefined,
        "x-pj-key": request.headers["x-pj-key"] as string | undefined,
        "x-trace-id": request.headers["x-trace-id"] as string | undefined,
        "x-span-id": request.headers["x-span-id"] as string | undefined,
        "x-correlation-id": request.headers["x-correlation-id"] as string | undefined,
        "x-causation-id": request.headers["x-causation-id"] as string | undefined,
      };

      const ctx = await contextClient.fetchContext(headers);
      if (!ctx) {
        return reply
          .status(401)
          .send({ data: null, errors: [{ message: "Unauthorized" }] });
      }

      request.project = ctx.project!;
      request.customer = ctx.customer || null;
    } catch (error) {
      console.error('Failed to fetch context via gRPC:', error);
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: "Unauthorized" }] });
    }
  };
}
