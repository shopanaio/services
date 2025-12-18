import type { RequestContext } from "../types/api.js";

export function ctxFromHeaders(headers: Record<string, unknown> | undefined): RequestContext {
  const cookie = (headers?.cookie ?? headers?.Cookie) as string | undefined;
  const acceptLanguage = (headers?.["accept-language"] ?? headers?.["Accept-Language"]) as string | undefined;
  const userAgent = (headers?.["user-agent"] ?? headers?.["User-Agent"]) as string | undefined;
  const ip = (headers?.["x-forwarded-for"] ?? headers?.["X-Forwarded-For"]) as string | undefined;

  return { cookie, acceptLanguage, userAgent, ip };
}

export function applySetCookieHeader(
  res: { setHeader: (name: string, value: string[] | string) => unknown },
  setCookie: string[] | undefined,
): void {
  if (!setCookie?.length) return;
  res.setHeader("Set-Cookie", setCookie);
}

