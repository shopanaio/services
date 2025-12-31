import type { FastifyReply, FastifyRequest } from "fastify";
import type { User } from "../../repositories/index.js";
import { Kernel } from "../../kernel/Kernel.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: {
      id: string;
      data: User | null;
    };
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
 * Extracts session token from Authorization header and validates session via Better Auth.
 */
export function buildAdminContextMiddleware() {
  return async function adminContextMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
  ) {
    const kernel = Kernel.getInstance();
    request.currentUser = { id: "", data: null };

    const token = extractBearerToken(request.headers.authorization);
    // Validate user session
    if (!kernel.repository || !token) {
      return;
    }

    // Validate session token via Better Auth
    const result = await kernel.repository.user.parseJwt(token);
    if (!result.success || !result.payload?.sub) {
      // Don't fail request - just leave user as null
      return;
    }

    request.currentUser = {
      id: result.payload.sub,
      data: null,
    };
  };
}
