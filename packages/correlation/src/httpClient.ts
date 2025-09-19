import type { CorrelationContext, ServiceCorrelationContext } from './types.js';
import { toCorrelationHeaders } from './headers.js';

/**
 * Parameters for HTTP client with correlation
 */
export interface CorrelatedHttpClientOptions {
  /** Base URL for API */
  baseUrl?: string;
  /** Request timeout (ms) */
  timeout?: number;
  /** Additional default headers */
  defaultHeaders?: Record<string, string>;
  /** Correlation context for all requests */
  correlationContext?: Partial<CorrelationContext>;
  /** Service context for extended correlation */
  serviceContext?: Partial<ServiceCorrelationContext>;
}

/**
 * Options for individual requests
 */
export interface CorrelatedRequestOptions extends RequestInit {
  /** Correlation context for specific request */
  correlationContext?: Partial<CorrelationContext>;
  /** Timeout override for specific request */
  timeout?: number;
  /** Full URL (ignores baseUrl) */
  fullUrl?: boolean;
}

/**
 * HTTP client with automatic correlation headers transmission
 */
export class CorrelatedHttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly correlationContext?: Partial<CorrelationContext>;

  constructor(options: CorrelatedHttpClientOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/+$/, '') ?? '';
    this.timeout = options.timeout ?? 5000;
    this.defaultHeaders = options.defaultHeaders ?? {};

    // Use serviceContext if provided, otherwise correlationContext
    this.correlationContext = options.serviceContext ?? options.correlationContext;
  }

  /**
   * Executes HTTP request with automatic correlation headers transmission
   */
  async fetch(url: string, options: CorrelatedRequestOptions = {}): Promise<Response> {
    const {
      correlationContext,
      timeout = this.timeout,
      fullUrl = false,
      ...fetchOptions
    } = options;

    // Determine final URL
    const finalUrl = fullUrl || url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${this.baseUrl}/${url.replace(/^\/+/, '')}`;

    // Collect correlation headers
    const requestCorrelationContext = correlationContext ?? this.correlationContext;
    const correlationHeaders = requestCorrelationContext
      ? toCorrelationHeaders(requestCorrelationContext)
      : {};

    // Collect final headers
    const headers = {
      'content-type': 'application/json',
      ...this.defaultHeaders,
      ...correlationHeaders,
      ...(fetchOptions.headers as Record<string, string> ?? {}),
    };

    // Timeout configuration
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (globalThis as any).fetch(finalUrl, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`HTTP request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(url: string, options: CorrelatedRequestOptions = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url: string, body?: unknown, options: CorrelatedRequestOptions = {}): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put(url: string, body?: unknown, options: CorrelatedRequestOptions = {}): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch(url: string, body?: unknown, options: CorrelatedRequestOptions = {}): Promise<Response> {
    return this.fetch(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete(url: string, options: CorrelatedRequestOptions = {}): Promise<Response> {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }

  /**
   * Creates new client with additional headers
   */
  withHeaders(additionalHeaders: Record<string, string>): CorrelatedHttpClient {
    return new CorrelatedHttpClient({
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      defaultHeaders: { ...this.defaultHeaders, ...additionalHeaders },
      correlationContext: this.correlationContext,
    });
  }

  /**
   * Creates new client with updated correlation context
   */
  withCorrelation(correlationContext: Partial<CorrelationContext>): CorrelatedHttpClient {
    return new CorrelatedHttpClient({
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      defaultHeaders: this.defaultHeaders,
      correlationContext: { ...this.correlationContext, ...correlationContext },
    });
  }

  /**
   * Creates new client with new base URL
   */
  withBaseUrl(baseUrl: string): CorrelatedHttpClient {
    return new CorrelatedHttpClient({
      baseUrl,
      timeout: this.timeout,
      defaultHeaders: this.defaultHeaders,
      correlationContext: this.correlationContext,
    });
  }
}

/**
 * Creates HTTP client for inter-service calls with automatic correlation
 */
export function createCorrelatedHttpClient(
  options: CorrelatedHttpClientOptions = {}
): CorrelatedHttpClient {
  return new CorrelatedHttpClient(options);
}

/**
 * Creates HTTP client for service with pre-configured service headers
 */
export function createServiceHttpClient(
  serviceContext: Partial<ServiceCorrelationContext>,
  options: Omit<CorrelatedHttpClientOptions, 'serviceContext'> = {}
): CorrelatedHttpClient {
  const serviceHeaders: Record<string, string> = {};

  if (serviceContext.apiKey) {
    serviceHeaders['x-api-key'] = serviceContext.apiKey;
  }
  if (serviceContext.projectId) {
    serviceHeaders['x-project-id'] = serviceContext.projectId;
  }
  if (serviceContext.userId) {
    serviceHeaders['x-user-id'] = serviceContext.userId;
  }
  if (serviceContext.userAgent) {
    serviceHeaders['user-agent'] = serviceContext.userAgent;
  }

  return new CorrelatedHttpClient({
    ...options,
    serviceContext,
    defaultHeaders: { ...serviceHeaders, ...options.defaultHeaders },
  });
}
