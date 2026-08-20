import type {
  ApplicationAuthHttpMethod,
  ApplicationAuthRouteManifestEntry,
  EffectiveApplicationAuthRouteManifest,
} from "../../../auth/applicationAuthRouteManifest.js";
import {
  APPLICATION_AUTH_PROVIDER_ID_MAX_LENGTH,
  APPLICATION_AUTH_PROVIDER_ID_PATTERN,
  type ApplicationAuthProviderName,
} from "../../../auth/applicationSocialProviders.js";

const UNRESERVED = /^[A-Za-z0-9\-._~]$/;
const HEX_BYTE = /^[0-9A-Fa-f]{2}$/;

export class ApplicationAuthPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationAuthPathError";
  }
}

/**
 * Normalize a raw application-relative pathname exactly once.
 *
 * Only percent-encoded RFC 3986 unreserved bytes are decoded. Encoded path
 * separators, backslashes, NULs, malformed UTF-8, duplicate slashes and dot
 * segments are rejected before the versioned route manifest is consulted.
 */
export function normalizeApplicationAuthRelativePath(rawPath: string): string {
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    throw new ApplicationAuthPathError("Application auth path is invalid");
  }
  if (rawPath.includes("\\") || rawPath.includes("\0")) {
    throw new ApplicationAuthPathError("Application auth path is invalid");
  }
  if (rawPath.length > 2048) {
    throw new ApplicationAuthPathError("Application auth path is too long");
  }

  try {
    decodeURIComponent(rawPath);
  } catch {
    throw new ApplicationAuthPathError("Application auth path encoding is invalid");
  }

  let normalized = "";
  for (let index = 0; index < rawPath.length; index += 1) {
    const character = rawPath[index]!;
    if (character !== "%") {
      normalized += character;
      continue;
    }

    const byte = rawPath.slice(index + 1, index + 3);
    if (!HEX_BYTE.test(byte)) {
      throw new ApplicationAuthPathError("Application auth path encoding is invalid");
    }
    const decoded = String.fromCharCode(Number.parseInt(byte, 16));
    if (decoded === "/" || decoded === "\\" || decoded === "\0") {
      throw new ApplicationAuthPathError("Encoded application auth path separator is forbidden");
    }
    normalized += UNRESERVED.test(decoded) ? decoded : `%${byte.toUpperCase()}`;
    index += 2;
  }

  if (normalized.includes("//") || normalized.includes("\\")) {
    throw new ApplicationAuthPathError("Application auth path structure is invalid");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new ApplicationAuthPathError("Application auth dot segments are forbidden");
  }
  return normalized;
}

export function isApplicationAuthRouteAllowed(
  manifest: EffectiveApplicationAuthRouteManifest,
  method: string,
  normalizedPath: string,
): boolean {
  if (method !== "GET" && method !== "POST") return false;
  return manifest.allowedRoutes.some(
    (entry) => entry.method === method && routeEntryMatches(entry, normalizedPath),
  );
}

export function assertApplicationAuthPreflightMethod(
  manifest: EffectiveApplicationAuthRouteManifest,
  requestedMethod: string,
  normalizedPath: string,
): ApplicationAuthHttpMethod | null {
  const method = requestedMethod.toUpperCase();
  if (method !== "GET" && method !== "POST") return null;
  return isApplicationAuthRouteAllowed(manifest, method, normalizedPath) ? method : null;
}

export function routeRequiresForcedRevisionCheck(normalizedPath: string): boolean {
  if (normalizedPath === "/oauth2/token") return true;
  const callback = /^\/callback\/([^/]+)$/u.exec(normalizedPath);
  if (!callback) return false;
  const provider = callback[1]!;
  return (
    provider.length <= APPLICATION_AUTH_PROVIDER_ID_MAX_LENGTH &&
    APPLICATION_AUTH_PROVIDER_ID_PATTERN.test(provider)
  );
}

export function resolveAllowedSocialCallbackProvider(input: {
  method: string;
  normalizedPath: string;
  manifest: EffectiveApplicationAuthRouteManifest;
}): ApplicationAuthProviderName | null {
  if (input.method !== "GET" && input.method !== "POST") return null;
  for (const provider of input.manifest.allowedSocialProviders) {
    const callbackPath = `/callback/${provider}`;
    if (input.normalizedPath !== callbackPath) continue;
    const exactEntry = input.manifest.allowedRoutes.some(
      (entry) =>
        entry.method === input.method &&
        entry.pathKind === "social-callback" &&
        entry.path === callbackPath,
    );
    return exactEntry ? provider : null;
  }
  return null;
}

function routeEntryMatches(
  entry: ApplicationAuthRouteManifestEntry,
  normalizedPath: string,
): boolean {
  if (entry.pathKind !== "reset-token") {
    return entry.path === normalizedPath;
  }

  const prefix = "/reset-password/";
  if (!normalizedPath.startsWith(prefix)) return false;
  const token = normalizedPath.slice(prefix.length);
  return token.length > 0 && token.length <= 1024 && !token.includes("/");
}
