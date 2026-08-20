import type { FastifyReply, FastifyRequest } from "fastify";
import { type CoreCustomer, type CoreStore, type GrpcConfigPort } from "@shopana/platform-api";
import {
  STOREFRONT_CONTEXT_HEADER,
  StorefrontContextVerifier,
  type ContextCustomer,
  type ContextStorefrontAccess,
} from "@shopana/shared-context";
import { setContext } from "@src/context/index.js";

declare module "fastify" {
  interface FastifyRequest {
    organizationId: string;
    store: CoreStore;
    customer: CoreCustomer | null;
    storefrontAccess: ContextStorefrontAccess;
    storefrontVisitorId: string;
  }
}

/**
 * Build core context middleware using gRPC client
 */
export function buildCoreContextMiddleware(grpcConfig: GrpcConfigPort) {
  void grpcConfig;
  const verifier = new StorefrontContextVerifier();

  return async function coreContextMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
      const raw = request.headers[STOREFRONT_CONTEXT_HEADER];
      if (typeof raw !== "string") throw new Error("missing context");
      const claims = verifier.verify(raw);
      request.organizationId = claims.organizationId;
      request.store = toCoreStore(claims.store);
      request.storefrontAccess = claims.storefront;
      request.storefrontVisitorId = claims.visitorId;
      request.customer = claims.customer ? toCoreCustomer(claims.customer) : null;

      // Set context in async local storage
      setContext({
        visitorId: claims.visitorId,
        storefrontAccess: claims.storefront,
        store: request.store,
        customer: request.customer,
        user: null, // TODO: Add user support if needed
      });
    } catch {
      return reply.status(401).send({ data: null, errors: [{ message: "Unauthorized" }] });
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
    currencies: [
      {
        code: store.currencyCode,
        exchangeRate: 1,
        isActive: true,
      },
    ],
    locale: store.defaultLocale,
    locales: store.locales.map((code) => ({ code, isActive: true })),
    stockStatuses: [],
  };
}
