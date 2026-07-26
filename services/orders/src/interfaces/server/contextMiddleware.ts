import type { FastifyRequest, FastifyReply } from "fastify";
import { type CoreCustomer, type CoreStore, type FetchContextHeaders, createCoreContextClient, type GrpcConfigPort } from "@shopana/platform-api";
import {
  STOREFRONT_CONTEXT_HEADER,
  StorefrontContextVerifier,
  type ContextCustomer,
  type ContextStorefrontAccess,
} from "@shopana/shared-context";
import { setContext } from "@src/context/index.js";

declare module "fastify" {
  interface FastifyRequest {
    store: CoreStore;
    customer: CoreCustomer | null;
    storefrontAccess?: ContextStorefrontAccess;
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
export function buildCoreContextMiddleware(
  grpcConfig: GrpcConfigPort,
  storefront = false,
) {
  const contextClient = createCoreContextClient({ config: grpcConfig });
  const verifier = storefront ? new StorefrontContextVerifier() : null;

  return async function coreContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      if (verifier) {
        const raw = request.headers[STOREFRONT_CONTEXT_HEADER];
        if (typeof raw !== "string") throw new Error("missing context");
        const claims = verifier.verify(raw);
        request.store = toCoreStore(claims.store);
        request.storefrontAccess = claims.storefront;
        request.customer = claims.customer
          ? toCoreCustomer(claims.customer)
          : null;
        setContext({
          apiKey: claims.storefront.credentialId,
          store: request.store,
          customer: request.customer,
          user: null,
        });
        return;
      }
      if (isGraphqlIntrospectionRequest(request)) return;
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

      request.store = ctx.store!;
      request.customer = ctx.customer || null;

      // Set context in async local storage
      setContext({
        apiKey: (request.headers["x-api-key"] as string) ?? "unknown",
        store: ctx.store!,
        customer: ctx.customer || null,
        user: null, // TODO: Add user support if needed
      });
    } catch (error) {
      console.error('Failed to fetch context via gRPC:', error);
      return reply
        .status(401)
        .send({ data: null, errors: [{ message: "Unauthorized" }] });
    }
  };
}

function toCoreCustomer(customer: ContextCustomer): CoreCustomer {
  return {
    id: customer.id,
    email: customer.email ?? "",
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    phone: customer.phone,
    language: customer.language,
    isVerified: customer.isVerified,
    isBlocked: customer.isBlocked,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function toCoreStore(store: import("@shopana/shared-context").ContextStore): CoreStore {
  return {
    id: store.id,
    name: store.name,
    email: store.email ?? "",
    phoneNumber: "",
    country: "",
    timezone: store.timezone,
    currency: store.currencyCode,
    currencies: [{
      code: store.currencyCode,
      exchangeRate: 1,
      isActive: true,
    }],
    locale: store.defaultLocale,
    locales: store.locales.map((code) => ({ code, isActive: true })),
    stockStatuses: [],
  };
}
