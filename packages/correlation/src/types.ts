/**
 * Correlation context for passing between services
 */
export interface CorrelationContext {
  /** Trace ID for request correlation */
  traceId: string;
  /** Span ID for correlation within tracing */
  spanId: string;
  /** Correlation ID for grouping related requests */
  correlationId: string;
  /** Causation ID to indicate the cause of the request */
  causationId: string;
}

/**
 * Correlation headers for HTTP requests
 */
export interface CorrelationHeaders {
  /** Trace ID header */
  traceId?: string;
  /** Span ID header */
  spanId?: string;
  /** Correlation ID header */
  correlationId?: string;
  /** Causation ID header */
  causationId?: string;
}

/**
 * Service context with correlation information
 */
export interface ServiceCorrelationContext extends CorrelationContext {
  /** API key */
  apiKey?: string;
  /** Project ID */
  projectId?: string;
  /** User ID */
  userId?: string;
  /** User agent */
  userAgent?: string;
}

/**
 * Extended correlation context for services
 */
export interface ServiceCorrelationExtendedContext extends ServiceCorrelationContext {
  apiKey: string;
  projectId: string;
}


/**
 * HTTP headers for correlation
 */
export const CORRELATION_HEADER_KEYS = {
  traceId: 'x-trace-id',
  spanId: 'x-span-id',
  correlationId: 'x-correlation-id',
  causationId: 'x-causation-id',
} as const;

/**
 * Unknown correlation context by default
 */
export const UnknownCorrelation: ServiceCorrelationExtendedContext = {
  traceId: "unknown",
  spanId: "unknown",
  correlationId: "unknown",
  causationId: "unknown",
  apiKey: "unknown",
  projectId: "unknown",
  userId: "unknown",
};
