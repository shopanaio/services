import type { FastifyReply, FastifyRequest } from "fastify";
import {
  buildAdminContextMiddleware as buildMiddleware,
  type AdminContextClaims,
} from "@shopana/shared-context";
import type { User } from "../../repositories/index.js";
import { Kernel } from "../../kernel/Kernel.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: {
      id: string;
      data: User | null;
      sessionId: string | null;
    };
    adminContext?: AdminContextClaims;
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

/**
 * Build admin context middleware.
 * Uses gateway-issued claims for authenticated admin requests while preserving
 * direct bearer handling for public sign-in, sign-up and token refresh flows.
 */
export function buildAdminContextMiddleware() {
  const middleware = buildMiddleware(undefined, {
    serviceName: "IAM",
    requireStore: false,
    requireAuth: false,
  });

  return async function adminContextMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const kernel = Kernel.getInstance();
    request.currentUser = { id: "", data: null, sessionId: null };

    await middleware(request, reply);
    if (reply.sent) return;

    if (request.adminContext) {
      request.currentUser = {
        id: request.adminContext.user.id,
        data: null,
        sessionId: request.adminContext.sessionId,
      };
      return;
    }

    const token = extractBearerToken(request.headers.authorization);
    // Validate user session
    if (!kernel.repository || !token) {
      return;
    }

    const validated = await kernel.repository.user.validateAccessJwt(token);
    if (!validated) {
      // Don't fail request - just leave user as null
      return;
    }

    request.currentUser = {
      id: validated.user.id,
      data: validated.user,
      sessionId: validated.sessionId,
    };
  };
}
