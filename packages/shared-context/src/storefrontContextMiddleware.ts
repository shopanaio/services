import type { FastifyReply, FastifyRequest } from "fastify";
import type { ContextStore, ContextCustomer } from "./types.js";
import {
  STOREFRONT_CONTEXT_HEADER,
  StorefrontContextVerifier,
  type ContextStorefrontAccess,
} from "./storefrontAccessContext.js";

declare module "fastify" {
  interface FastifyRequest {
    store?: ContextStore;
    storefrontAccess?: ContextStorefrontAccess;
    customer: ContextCustomer | null;
  }
}

export interface StorefrontContextMiddlewareOptions {
  readonly serviceName?: string;
  readonly verifier?: StorefrontContextVerifier;
}

export function buildStorefrontContextMiddleware(
  _legacyBroker?: unknown,
  options: StorefrontContextMiddlewareOptions = {},
) {
  const verifier = options.verifier ?? new StorefrontContextVerifier();
  return async function storefrontContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const raw = request.headers[STOREFRONT_CONTEXT_HEADER];
    if (typeof raw !== "string" || !raw) {
      return reply.status(401).send({
        data: null,
        errors: [{
          message: "Verified storefront context is required",
          extensions: { code: "UNAUTHENTICATED" },
        }],
      });
    }
    try {
      const claims = verifier.verify(raw);
      request.store = claims.store;
      request.storefrontAccess = claims.storefront;
      request.customer = null;
    } catch {
      return reply.status(401).send({
        data: null,
        errors: [{
          message: "Invalid storefront context",
          extensions: { code: "UNAUTHENTICATED" },
        }],
      });
    }
  };
}
