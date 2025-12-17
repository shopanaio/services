import type { FastifyReply, FastifyRequest } from "fastify";

export interface ContextMiddlewareConfig {
  // TODO: add config options
}

/**
 * Build admin context middleware
 */
export function buildAdminContextMiddleware(_config: ContextMiddlewareConfig) {
  return async function adminContextMiddleware(
    _request: FastifyRequest,
    _reply: FastifyReply
  ) {
    // TODO: implement context fetching
  };
}
