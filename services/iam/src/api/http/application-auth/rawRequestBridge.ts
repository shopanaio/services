import type { FastifyReply, FastifyRequest } from "fastify";

const MAX_AUTH_BODY_BYTES = 64 * 1024;
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const RESPONSE_BOUNDARY_HEADERS = new Set([
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-allow-origin",
  "access-control-expose-headers",
  "access-control-max-age",
  "x-request-id",
  "vary",
]);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

export const APPLICATION_AUTH_BODY_LIMIT = MAX_AUTH_BODY_BYTES;

export class ApplicationAuthRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly oauthError = "invalid_request"
  ) {
    super(message);
    this.name = "ApplicationAuthRequestError";
  }
}

export interface RawApplicationAuthRequest {
  rawUrl: string;
  rawPath: string;
  rawQuery: string;
  body: Buffer | undefined;
  contentType: string | null;
}

export function readRawApplicationAuthRequest(
  request: FastifyRequest
): RawApplicationAuthRequest {
  const rawUrl = request.raw.url;
  if (!rawUrl || !rawUrl.startsWith("/") || rawUrl.includes("#")) {
    throw new ApplicationAuthRequestError("Request target is invalid");
  }
  const queryIndex = rawUrl.indexOf("?");
  const rawPath = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? "" : rawUrl.slice(queryIndex + 1);
  const body = request.body;
  if (body !== undefined && !Buffer.isBuffer(body)) {
    throw new ApplicationAuthRequestError("Raw request body is unavailable");
  }
  if (body && body.byteLength > MAX_AUTH_BODY_BYTES) {
    throw new ApplicationAuthRequestError(
      "Request body is too large",
      413
    );
  }
  return {
    rawUrl,
    rawPath,
    rawQuery,
    body: body as Buffer | undefined,
    contentType: readSingleHeader(request.headers["content-type"]),
  };
}

export function validateApplicationAuthRequestBody(input: {
  method: string;
  normalizedPath: string;
  socialCallback: boolean;
  raw: RawApplicationAuthRequest;
  contentEncoding: string | string[] | undefined;
}): void {
  const contentEncoding = readSingleHeader(input.contentEncoding);
  if (contentEncoding && contentEncoding.toLowerCase() !== "identity") {
    throw new ApplicationAuthRequestError(
      "Request content encoding is unsupported"
    );
  }
  validateUrlEncodedBytes(input.raw.rawQuery, "query");

  if (input.method === "GET") {
    if (input.raw.body && input.raw.body.length > 0) {
      throw new ApplicationAuthRequestError("GET request body is forbidden");
    }
    return;
  }

  const policy = contentPolicyFor(
    input.normalizedPath,
    input.socialCallback
  );
  const body = input.raw.body;
  if (policy === "none") {
    if (body && body.length > 0) {
      throw new ApplicationAuthRequestError("Request body is forbidden");
    }
    return;
  }
  if ((!body || body.length === 0) && policy === "form-or-json") {
    return;
  }
  if (!body || body.length === 0) {
    throw new ApplicationAuthRequestError("Request body is required");
  }

  const mediaType = parseAuthMediaType(input.raw.contentType);
  if (policy === "form" && mediaType !== "application/x-www-form-urlencoded") {
    throw new ApplicationAuthRequestError(
      "OAuth protocol request must use application/x-www-form-urlencoded"
    );
  }
  if (policy === "json" && mediaType !== "application/json") {
    throw new ApplicationAuthRequestError(
      "Application auth request must use application/json"
    );
  }
  if (
    policy === "form-or-json" &&
    mediaType !== "application/json" &&
    mediaType !== "application/x-www-form-urlencoded"
  ) {
    throw new ApplicationAuthRequestError(
      "Application auth callback content type is unsupported"
    );
  }

  if (mediaType === "application/json") {
    parseJsonBody(body);
  } else {
    validateUrlEncodedBytes(decodeUtf8(body), "form");
  }
}

export function parseRawSearchParams(raw: string): URLSearchParams {
  validateUrlEncodedBytes(raw, "form");
  return new URLSearchParams(raw);
}

export function parseJsonBody(body: Buffer): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(decodeUtf8(body));
  } catch {
    throw new ApplicationAuthRequestError("JSON request body is malformed");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationAuthRequestError("JSON request body must be an object");
  }
  return value as Record<string, unknown>;
}

export function createApplicationAuthFetchRequest(input: {
  request: FastifyRequest;
  raw: RawApplicationAuthRequest;
  publicBaseUrl: string;
}): Request {
  const headers = new Headers();
  for (let index = 0; index < input.request.raw.rawHeaders.length; index += 2) {
    const rawName = input.request.raw.rawHeaders[index];
    const rawValue = input.request.raw.rawHeaders[index + 1];
    if (!rawName || rawValue === undefined) continue;
    const name = rawName.toLowerCase();
    if (
      name === "host" ||
      name === "content-length" ||
      name.startsWith("x-forwarded-") ||
      HOP_BY_HOP_HEADERS.has(name)
    ) {
      continue;
    }
    headers.append(rawName, rawValue);
  }
  headers.set("host", new URL(input.publicBaseUrl).host);
  headers.set("x-forwarded-for", input.request.ip);
  headers.set("x-request-id", String(input.request.id));

  const init: RequestInit = {
    method: input.request.method,
    headers,
    redirect: "manual",
  };
  if (
    input.request.method !== "GET" &&
    input.request.method !== "HEAD" &&
    input.raw.body !== undefined
  ) {
    init.body = new Uint8Array(input.raw.body);
  }
  return new Request(`${input.publicBaseUrl}${input.raw.rawUrl}`, init);
}

export async function sendApplicationAuthFetchResponse(
  response: Response,
  reply: FastifyReply
): Promise<void> {
  reply.code(response.status);
  for (const [name, value] of response.headers.entries()) {
    const lowerName = name.toLowerCase();
    if (
      lowerName === "set-cookie" ||
      lowerName === "content-length" ||
      HOP_BY_HOP_HEADERS.has(lowerName) ||
      RESPONSE_BOUNDARY_HEADERS.has(lowerName)
    ) {
      continue;
    }
    reply.header(name, value);
  }

  const setCookieHeaders = readSetCookieHeaders(response.headers);
  if (setCookieHeaders.length > 0) {
    reply.header("set-cookie", setCookieHeaders);
  }

  if (response.body === null || reply.request.method === "HEAD") {
    await reply.send();
    return;
  }
  const body = Buffer.from(await response.arrayBuffer());
  await reply.send(body);
}

function contentPolicyFor(
  normalizedPath: string,
  socialCallback: boolean
): "none" | "form" | "json" | "form-or-json" {
  if (
    normalizedPath === "/oauth2/token" ||
    normalizedPath === "/oauth2/introspect" ||
    normalizedPath === "/oauth2/revoke"
  ) {
    return "form";
  }
  if (
    normalizedPath === "/oauth2/userinfo" ||
    normalizedPath === "/sign-out"
  ) {
    return "none";
  }
  if (socialCallback) return "form-or-json";
  if (
    normalizedPath === "/login/password" ||
    normalizedPath === "/signup/password" ||
    normalizedPath === "/password/forgot" ||
    normalizedPath === "/password/reset" ||
    normalizedPath === "/verification/resend" ||
    normalizedPath === "/email-otp/request" ||
    normalizedPath === "/email-otp/verify" ||
    normalizedPath === "/consent" ||
    normalizedPath === "/logout" ||
    normalizedPath === "/login/social" ||
    normalizedPath === "/account/connections/link" ||
    normalizedPath === "/account/connections/unlink"
  ) {
    return "form";
  }
  return "json";
}

function parseAuthMediaType(contentType: string | null): string | null {
  if (!contentType) return null;
  const parts = contentType.split(";").map((part) => part.trim());
  const mediaType = parts.shift()?.toLowerCase() ?? null;
  for (const parameter of parts) {
    const match = /^charset=(?:"?)([^";]+)(?:"?)$/i.exec(parameter);
    if (!match || match[1]!.toLowerCase() !== "utf-8") {
      throw new ApplicationAuthRequestError(
        "Request content type parameters are unsupported"
      );
    }
  }
  return mediaType;
}

function validateUrlEncodedBytes(
  value: string,
  source: "query" | "form"
): void {
  for (const component of value.split(/[&=]/u)) {
    if (component.includes("\0")) {
      throw new ApplicationAuthRequestError(
        `${source === "query" ? "Query" : "Form"} contains NUL`
      );
    }
    const percent = /%(?![0-9A-Fa-f]{2})/u.exec(component);
    if (percent) {
      throw new ApplicationAuthRequestError(
        `${source === "query" ? "Query" : "Form"} encoding is malformed`
      );
    }
    try {
      const decoded = decodeURIComponent(component.replace(/\+/g, " "));
      if (decoded.includes("\0")) {
        throw new Error("NUL");
      }
    } catch {
      throw new ApplicationAuthRequestError(
        `${source === "query" ? "Query" : "Form"} encoding is malformed`
      );
    }
  }
}

function decodeUtf8(buffer: Buffer): string {
  try {
    return UTF8_DECODER.decode(buffer);
  } catch {
    throw new ApplicationAuthRequestError("Request body is not valid UTF-8");
  }
}

function readSingleHeader(
  value: string | string[] | undefined
): string | null {
  if (value === undefined) return null;
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      throw new ApplicationAuthRequestError("Duplicate HTTP header is invalid");
    }
    return value[0] ?? null;
  }
  return value;
}

function readSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = withGetSetCookie.getSetCookie?.();
  if (values && values.length > 0) return values;
  const combined = headers.get("set-cookie");
  return combined ? splitCombinedSetCookieHeader(combined) : [];
}

function splitCombinedSetCookieHeader(value: string): string[] {
  const result: string[] = [];
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== ",") continue;
    let cursor = index + 1;
    while (cursor < value.length && value[cursor] === " ") cursor += 1;
    const equals = value.indexOf("=", cursor);
    const semicolon = value.indexOf(";", cursor);
    const comma = value.indexOf(",", cursor);
    if (
      equals !== -1 &&
      (semicolon === -1 || equals < semicolon) &&
      (comma === -1 || equals < comma)
    ) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
}
