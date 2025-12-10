import type { CoreProject, CoreUser } from "@shopana/platform-api";
import {
  createCoreContextClient,
  type GrpcConfigPort,
} from "@shopana/platform-api";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    project: CoreProject;
    user: CoreUser;
  }
}
//

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
 * Build admin context middleware using gRPC client
 * Requires slug and authorization headers for admin API
 */
export function buildAdminContextMiddleware(grpcConfig: GrpcConfigPort) {
  const contextClient = createCoreContextClient({ config: grpcConfig });

  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (isGraphqlIntrospectionRequest(request)) {
      return;
    }

    try {
      const slug = request.headers["x-pj-key"] as string | undefined;
      const authorization = request.headers.authorization;

      console.log("=== MIDDLEWARE DEBUG ===");
      console.log("x-pj-key:", slug);
      console.log("authorization:", authorization ? "present" : "missing");

      if (!slug) {
        return reply.status(400).send({
          data: null,
          errors: [{ message: "Missing x-shopana-slug header" }],
        });
      }

      if (!authorization) {
        return reply.status(401).send({
          data: null,
          errors: [{ message: "Missing authorization header" }],
        });
      }

      console.log("=== GRPC CALL DEBUG ===");
      console.log("Calling fetchContext with headers:", {
        authorization: authorization ? "Bearer ..." : "missing",
        "x-pj-key": slug,
      });

      const ctx = await contextClient.fetchContext({
        authorization,
        "x-pj-key": slug,
        "x-trace-id": request.headers["x-trace-id"] as string | undefined,
        "x-span-id": request.headers["x-span-id"] as string | undefined,
        "x-correlation-id": request.headers["x-correlation-id"] as
          | string
          | undefined,
        "x-causation-id": request.headers["x-causation-id"] as
          | string
          | undefined,
      });

      console.log("=== GRPC RESPONSE ===");
      console.log("ctx:", ctx);
      console.log("ctx?.project:", ctx?.project);
      console.log("ctx?.tenant:", ctx?.tenant);

      if (!ctx || !ctx.project || !ctx.tenant) {
        return reply
          .status(401)
          .send({ data: null, errors: [{ message: "Unauthorized" }] });
      }

      request.project = ctx.project;
      request.user = ctx.tenant;
    } catch (error) {
      console.error("Failed to fetch admin context via gRPC:", error);
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: "Unauthorized" }] });
    }
  };
}
