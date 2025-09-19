import { v4 as uuidv4 } from 'uuid';
import type { CorrelationContext, CorrelationHeaders, ServiceCorrelationContext } from './types.js';
import { CORRELATION_HEADER_KEYS } from './types.js';

/**
 * Creates new correlation context with unique IDs
 */
export function createCorrelationContext(): CorrelationContext {
  const traceId = uuidv4();
  const spanId = uuidv4();

  return {
    traceId,
    spanId,
    correlationId: traceId, // Use traceId as correlationId by default
    causationId: traceId,   // For root context causationId = traceId
  };
}

/**
 * Creates child correlation context for new span
 */
export function createChildCorrelationContext(
  parentContext: CorrelationContext
): CorrelationContext {
  const spanId = uuidv4();

  return {
    ...parentContext,
    spanId,
    causationId: parentContext.spanId, // Parent span becomes causation
  };
}

/**
 * Extracts correlation context from HTTP headers
 */
export function extractCorrelationFromHeaders(
  headers: Record<string, unknown>
): Partial<CorrelationContext> {
  const maybeString = (v: unknown): string | undefined =>
    typeof v === 'string' && v.length > 0 ? v : undefined;

  const traceId = maybeString(headers[CORRELATION_HEADER_KEYS.traceId]);
  const spanId = maybeString(headers[CORRELATION_HEADER_KEYS.spanId]);
  const correlationId = maybeString(headers[CORRELATION_HEADER_KEYS.correlationId]);
  const causationId = maybeString(headers[CORRELATION_HEADER_KEYS.causationId]);

  return { traceId, spanId, correlationId, causationId };
}

/**
 * Creates or complements correlation context from headers
 */
export function deriveCorrelationContext(
  headers: Record<string, unknown>
): CorrelationContext {
  const incoming = extractCorrelationFromHeaders(headers);

  // Validate incoming IDs, if they are not valid - generate new ones
  const traceId = (incoming.traceId && isValidCorrelationId(incoming.traceId))
    ? incoming.traceId
    : uuidv4();
  const spanId = (incoming.spanId && isValidCorrelationId(incoming.spanId))
    ? incoming.spanId
    : uuidv4();
  const correlationId = (incoming.correlationId && isValidCorrelationId(incoming.correlationId))
    ? incoming.correlationId
    : traceId;
  const causationId = (incoming.causationId && isValidCorrelationId(incoming.causationId))
    ? incoming.causationId
    : traceId; // For root contexts use traceId as causationId

  return { traceId, spanId, correlationId, causationId };
}

/**
 * Validates UUID v4 string
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates correlation ID
 */
export function isValidCorrelationId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && isValidUUID(id);
}

/**
 * Validates correlation context
 */
export function isValidCorrelationContext(
  context: Partial<CorrelationContext>
): context is CorrelationContext {
  return !!(
    context.traceId &&
    context.spanId &&
    context.correlationId &&
    context.causationId &&
    isValidCorrelationId(context.traceId) &&
    isValidCorrelationId(context.spanId) &&
    isValidCorrelationId(context.correlationId) &&
    isValidCorrelationId(context.causationId)
  );
}

/**
 * Creates correlation context from service context
 */
export function createServiceCorrelationContext(
  serviceContext: Partial<ServiceCorrelationContext>
): ServiceCorrelationContext {
  const correlation = serviceContext.traceId && serviceContext.spanId && serviceContext.correlationId && serviceContext.causationId
    ? {
        traceId: serviceContext.traceId,
        spanId: serviceContext.spanId,
        correlationId: serviceContext.correlationId,
        causationId: serviceContext.causationId,
      }
    : createCorrelationContext();

  return {
    ...correlation,
    apiKey: serviceContext.apiKey,
    projectId: serviceContext.projectId,
    userId: serviceContext.userId,
    userAgent: serviceContext.userAgent,
  };
}
