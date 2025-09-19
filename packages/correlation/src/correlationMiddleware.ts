import type { FastifyRequest, FastifyReply } from "fastify";
import { ensureCorrelationHeaders } from "./headers.js";
import { deriveCorrelationContext } from "./correlation.js";
import { createCorrelationFromHeaders, bindCorrelation } from "./correlationContext.js";
import type { ServiceCorrelationExtendedContext } from "./types.js";

declare module "fastify" {
  interface FastifyRequest {
    correlationContext?: ServiceCorrelationExtendedContext;
  }
}

/**
 * Creates middleware for handling correlation headers in Fastify services
 */
export function buildCorrelationMiddleware() {
  return async function correlationMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    // Normalize/add correlation headers
    const baseCorrelation = deriveCorrelationContext(request.headers);
    const withCorrelation = ensureCorrelationHeaders(
      request.headers as Record<string, string>,
      baseCorrelation
    );

    // Update request headers
    for (const [k, v] of Object.entries(withCorrelation)) {
      (request.headers as Record<string, string>)[k.toLowerCase()] = String(v);
    }

    // Extract authentication data from headers
    const apiKey = (request.headers['x-api-key'] as string) || 'unknown';
    const projectId = (request.headers['x-project-id'] as string) || 'unknown';
    const userId = request.headers['x-user-id'] as string | undefined;

    // Create correlation context
    const correlationContext = createCorrelationFromHeaders(
      request.headers,
      apiKey,
      projectId,
      userId
    );

    // Bind context to async local storage
    bindCorrelation(correlationContext);

    // Save to request for use in handlers/resolvers
    request.correlationContext = correlationContext;
  };
}

/**
 * Helper function to get correlation context from request
 */
export function getCorrelationFromRequest(request: FastifyRequest): ServiceCorrelationExtendedContext | undefined {
  return request.correlationContext;
}
