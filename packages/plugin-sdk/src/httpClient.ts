/**
 * Lightweight JSON HTTP client over `got`, bringing response close to Web Fetch API interface.
 *
 * Main features:
 * - Base URL is forcibly validated for correctness and HTTPS in production.
 * - Headers `Accept`, `User-Agent`, `X-Request-Id`, `Authorization` are set centrally.
 * - Timeout support via `AbortController` and pre-request headers.
 * - Returns object compatible by key fields with `Response` (`ok`, `status`, `json`, `text`...).
 */
import got, { type ExtendOptions, type Response as GotResponse } from "got";

export type JsonInit = {
  timeoutMs?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type HttpClient = {
  get(path: string, init?: JsonInit): Promise<Response>;
  post(path: string, body?: unknown, init?: JsonInit): Promise<Response>;
  put(path: string, body?: unknown, init?: JsonInit): Promise<Response>;
  delete(path: string, init?: JsonInit): Promise<Response>;
};

/**
 * Merges headers: applies overrides on top of defaults with proper value filtering.
 * @internal
 */
function mergeHeaders(
  defaults: Record<string, string>,
  overrides?: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = { ...defaults };
  if (overrides)
    for (const [k, v] of Object.entries(overrides))
      if (typeof v === "string") out[k] = v;
  return out;
}

/**
 * Builds `AbortSignal` considering timeout and possible original cancellation signal.
 * @internal
 */
function withTimeout(
  signal: AbortSignal | undefined,
  timeoutMs?: number
): AbortSignal | undefined {
  if (!timeoutMs || timeoutMs <= 0) return signal;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
  }
  controller.signal.addEventListener("abort", () => clearTimeout(timer), {
    once: true,
  });
  return controller.signal;
}

/**
 * Validates base URL and forbids non-HTTPS in production.
 * @throws Error if URL string is incorrect or violates security policy.
 * @internal
 */
function ensureHttpsBaseUrl(baseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(baseUrl || "https://google.com");
  } catch {
    throw new Error(`Invalid baseUrl: ${baseUrl}`);
  }
  const isProd = process.env.NODE_ENV === "production";
  if (url.protocol !== "https:" && isProd)
    throw new Error("Insecure baseUrl: only https:// is allowed");
  return url;
}

/**
 * Creates JSON-oriented HTTP client with base URL and common headers.
 *
 * @param baseUrl Base service address (https:// required in prod).
 * @param init Additional parameters: API key, default headers, request identifiers.
 * @returns Object with `get/post/put/delete` methods, each returning Fetch-like `Response`.
 */
export function createJsonHttpClient(
  baseUrl: string,
  init?: {
    apiKey?: string;
    defaultHeaders?: Record<string, string>;
    requestId?: string;
    userAgent?: string;
  }
): HttpClient {
  const base = ensureHttpsBaseUrl(baseUrl);
  const defaultHeaders: Record<string, string> = mergeHeaders(
    {
      Accept: "application/json",
      ...(init?.userAgent ? { "User-Agent": init.userAgent } : {}),
      ...(init?.requestId ? { "X-Request-Id": init.requestId } : {}),
      ...(init?.apiKey ? { Authorization: `Bearer ${init.apiKey}` } : {}),
    },
    init?.defaultHeaders
  );

  const client = got.extend({
    prefixUrl: base.toString(),
    headers: defaultHeaders,
    http2: true,
    throwHttpErrors: false,
    retry: { limit: 0 },
    responseType: "json",
  } satisfies ExtendOptions);

  const toResponse = (r: GotResponse<any>): Response => {
    // Emulate Web Fetch Response partially: ok/status/text/json
    const bodyText =
      typeof r.body === "string" ? r.body : JSON.stringify(r.body);
    return {
      ok: r.statusCode >= 200 && r.statusCode < 300,
      status: r.statusCode,
      headers: new Headers(
        Object.fromEntries(
          Object.entries(r.headers).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.join(", ") : v ?? "",
          ])
        )
      ),
      url: r.url,
      redirected: r.redirectUrls.length > 0,
      type: "basic",
      statusText: r.statusMessage ?? "",
      clone: () => toResponse(r),
      arrayBuffer: async () => new TextEncoder().encode(bodyText).buffer,
      blob: async () => new Blob([bodyText], { type: "application/json" }),
      formData: async () => {
        throw new Error("Not implemented");
      },
      json: async () => r.body,
      text: async () => bodyText,
      body: null as any,
      bodyUsed: true,
    } as unknown as Response;
  };

  const schedule = async (
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    initOverrides?: JsonInit
  ): Promise<Response> => {
    const signal = withTimeout(initOverrides?.signal, initOverrides?.timeoutMs);
    const headers = mergeHeaders(defaultHeaders, initOverrides?.headers);
    const url =
      path.startsWith("http://") || path.startsWith("https://")
        ? new URL(path)
        : new URL(path.startsWith("/") ? path.slice(1) : path, base);
    if (url.protocol !== "https:" && process.env.NODE_ENV === "production")
      throw new Error("Insecure URL override: only https:// is allowed");
    const res = await client(url.toString(), {
      method,
      headers,
      json: body,
      signal,
      // per-request timeout handled via abort
    });
    return toResponse(res);
  };

  return {
    get: (path: string, initOverrides?: JsonInit) =>
      schedule("GET", path, undefined, initOverrides),
    post: (path: string, body?: unknown, initOverrides?: JsonInit) =>
      schedule("POST", path, body, initOverrides),
    put: (path: string, body?: unknown, initOverrides?: JsonInit) =>
      schedule("PUT", path, body, initOverrides),
    delete: (path: string, initOverrides?: JsonInit) =>
      schedule("DELETE", path, undefined, initOverrides),
  };
}
