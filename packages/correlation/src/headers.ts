import type { CorrelationContext, CorrelationHeaders } from './types.js';
import { CORRELATION_HEADER_KEYS } from './types.js';

/**
 * Converts correlation context to HTTP headers
 */
export function toCorrelationHeaders(
  context: Partial<CorrelationContext>
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (context.traceId) {
    headers[CORRELATION_HEADER_KEYS.traceId] = context.traceId;
  }
  if (context.spanId) {
    headers[CORRELATION_HEADER_KEYS.spanId] = context.spanId;
  }
  if (context.correlationId) {
    headers[CORRELATION_HEADER_KEYS.correlationId] = context.correlationId;
  }
  if (context.causationId) {
    headers[CORRELATION_HEADER_KEYS.causationId] = context.causationId;
  }

  return headers;
}

/**
 * Converts HTTP headers to correlation headers format
 */
export function toCorrelationHeadersFormat(
  context: Partial<CorrelationContext>
): CorrelationHeaders {
  return {
    traceId: context.traceId,
    spanId: context.spanId,
    correlationId: context.correlationId,
    causationId: context.causationId,
  };
}

/**
 * Adds correlation headers to existing headers
 */
export function mergeCorrelationHeaders(
  existingHeaders: Record<string, string>,
  correlationContext: Partial<CorrelationContext>
): Record<string, string> {
  const correlationHeaders = toCorrelationHeaders(correlationContext);
  return { ...existingHeaders, ...correlationHeaders };
}

/**
 * Ensures presence of correlation headers in header set
 */
export function ensureCorrelationHeaders(
  headers: Record<string, string>,
  correlationContext: Partial<CorrelationContext>
): Record<string, string> {
  const correlationHeaders = toCorrelationHeaders(correlationContext);
  const result = { ...headers };

  // Add only missing headers
  Object.entries(correlationHeaders).forEach(([key, value]) => {
    if (!result[key]) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Creates complete HTTP headers for service with correlation
 */
export function createServiceHeaders(
  correlationContext: Partial<CorrelationContext>,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers = toCorrelationHeaders(correlationContext);

  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }

  return headers;
}
