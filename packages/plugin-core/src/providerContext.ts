/**
 * Contracts for plugin provider context and its creation factory.
 *
 * The module encapsulates access to logger and HTTP client factory so that
 * plugins can get a unified tool for working with external APIs
 * (with headers `X-Request-Id`, `User-Agent`, `Authorization`, etc.).
 */
export type BasicLogger = {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

export type RequestMeta = { requestId?: string; userAgent?: string };

/**
 * Minimal interface of the context that the plugin will receive in `create(ctx, config)`.
 * Allows logging and creating a configured HTTP client for external service calls.
 */
export type ProviderContextLike<THttpClient> = Readonly<{
  logger: BasicLogger;
  createHttp: (
    baseUrl: string,
    init?: { apiKey?: string; defaultHeaders?: Record<string, string> }
  ) => THttpClient;
}>;

import { createJsonHttpClient, type HttpClient } from "./httpClient";

/**
 * Creates a standard provider context with logger and JSON HTTP client factory.
 *
 * @param logger Application logger implementation.
 * @param requestMeta Request metadata (identifier and User-Agent) that will be passed to HTTP headers.
 * @returns Context object compatible with plugins of this core.
 */
export function createProviderContext(
  logger: BasicLogger
): ProviderContextLike<HttpClient> {
  return {
    logger,
    createHttp(
      baseUrl: string,
      init?: { apiKey?: string; defaultHeaders?: Record<string, string> }
    ) {
      return createJsonHttpClient(baseUrl, {
        apiKey: init?.apiKey,
        defaultHeaders: init?.defaultHeaders,
      });
    },
  };
}
