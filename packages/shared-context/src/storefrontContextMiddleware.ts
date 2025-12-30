import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type {
  ContextStore,
  ContextCustomer,
  GetCurrentStoreResult,
} from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    store: ContextStore;
    customer: ContextCustomer | null;
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

export interface StorefrontContextMiddlewareOptions {
  /** Service name for logging */
  serviceName?: string;
  /** Whether x-api-key header is required */
  requireApiKey?: boolean;
}

/**
 * Build storefront context middleware using broker calls.
 * Requires x-store-name and x-api-key headers for storefront API.
 *
 * Sets request.store and request.customer from:
 * - broker.call("project.getCurrentStore", { name })
 * - Customer lookup via API key (TODO: implement)
 */
export function buildStorefrontContextMiddleware(
  broker: ServiceBroker,
  options: StorefrontContextMiddlewareOptions = {}
) {
  const serviceName = options.serviceName ?? "SERVICE";
  const requireApiKey = options.requireApiKey ?? true;

  return async function storefrontContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    if (isGraphqlIntrospectionRequest(request)) {
      return;
    }

    const storeName = request.headers["x-store-name"] as string | undefined;
    const apiKey = request.headers["x-api-key"] as string | undefined;

    if (!storeName) {
      return reply.status(400).send({
        data: null,
        errors: [{ message: "Missing x-store-name header" }],
      });
    }

    if (requireApiKey && !apiKey) {
      return reply.status(401).send({
        data: null,
        errors: [{ message: "Missing x-api-key header" }],
      });
    }

    try {
      // Get store via broker
      const storeResult = await broker.call<
        GetCurrentStoreResult,
        { name: string }
      >("project.getCurrentStore", { name: storeName });

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

      request.store = storeResult.store;
      request.customer = null; // TODO: Implement customer lookup via API key
    } catch (error) {
      console.error(`[${serviceName}] Context loading failed:`, error);
      return reply.status(500).send({
        data: null,
        errors: [{ message: "Context loading failed" }],
      });
    }
  };
}
