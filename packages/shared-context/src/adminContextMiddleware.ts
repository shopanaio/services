import type { FastifyReply, FastifyRequest } from "fastify";
import type { ContextStore, ContextUser } from "./types.js";
import {
  ADMIN_CONTEXT_HEADER,
  AdminContextVerifier,
  type AdminContextClaims,
} from "./adminAccessContext.js";

declare module "fastify" {
  interface FastifyRequest {
    store?: ContextStore;
    user: ContextUser;
    adminContext?: AdminContextClaims;
  }
}

export interface AdminContextMiddlewareOptions {
  /** Service name for logging */
  serviceName?: string;
  /** Whether x-store-name header is required (default: true) */
  requireStore?: boolean;
  /** Whether authorization header is required (default: true) */
  requireAuth?: boolean;
  /** Optional verifier override, primarily for isolated service configuration. */
  verifier?: AdminContextVerifier;
}

/**
 * Build admin context middleware using the short-lived JWS issued by the
 * Admin Gateway. No IAM or Project calls are made from the subgraph.
 */
export function buildAdminContextMiddleware(
  _legacyBroker?: unknown,
  options: AdminContextMiddlewareOptions = {}
) {
  const requireStore = options.requireStore ?? true;
  const requireAuth = options.requireAuth ?? true;
  const verifier = options.verifier ?? new AdminContextVerifier();

  return async function adminContextMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const raw = request.headers[ADMIN_CONTEXT_HEADER];
    if (typeof raw !== "string" || !raw) {
      if (requireAuth) {
        return reply.status(401).send({
          data: null,
          errors: [{
            message: "Verified admin context is required",
            extensions: { code: "UNAUTHENTICATED" },
          }],
        });
      }
      return;
    }

    try {
      const claims = verifier.verify(raw);
      if (requireStore && !claims.store) {
        return reply.status(400).send({
          data: null,
          errors: [{
            message: "Verified admin store context is required",
            extensions: { code: "BAD_REQUEST" },
          }],
        });
      }
      request.adminContext = claims;
      request.user = claims.user;
      request.store = claims.store ?? undefined;
    } catch {
      return reply.status(401).send({
        data: null,
        errors: [{
          message: "Invalid admin context",
          extensions: { code: "UNAUTHENTICATED" },
        }],
      });
    }
  };
}
