import type { FastifyReply, FastifyRequest } from "fastify";
import type { ContextProject, ContextUser } from "../../context/index.js";

declare module "fastify" {
  interface FastifyRequest {
    project: ContextProject;
    user: ContextUser;
  }
}

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
