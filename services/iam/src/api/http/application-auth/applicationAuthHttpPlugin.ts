import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { z } from "zod";
import type { ApplicationAuthFactoryRuntime } from "../../../auth/ApplicationAuthFactory.js";
import type { Kernel } from "../../../kernel/Kernel.js";
import {
  ApplicationOAuthResourcePolicyError,
  ApplicationOAuthResourcePolicyGuard,
} from "./ApplicationOAuthResourcePolicyGuard.js";
import { enforceApplicationOAuthMetadata } from "./oauthMetadata.js";
import {
  APPLICATION_AUTH_BODY_LIMIT,
  ApplicationAuthRequestError,
  createApplicationAuthFetchRequest,
  parseJsonBody,
  readRawApplicationAuthRequest,
  sendApplicationAuthFetchResponse,
  validateApplicationAuthRequestBody,
  type RawApplicationAuthRequest,
} from "./rawRequestBridge.js";
import {
  ApplicationAuthPathError,
  assertApplicationAuthPreflightMethod,
  isApplicationAuthRouteAllowed,
  normalizeApplicationAuthRelativePath,
  routeRequiresForcedRevisionCheck,
} from "./routeManifest.js";

interface ApplicationAuthHttpPluginOptions {
  kernel: Kernel;
  publicBaseUrl: string;
}

interface ApplicationAuthRouteParams {
  applicationId: string;
  "*": string;
}

const ALLOWED_CORS_REQUEST_HEADERS = new Set([
  "authorization",
  "content-type",
  "x-request-id",
]);

class ApplicationAuthBoundaryError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly oauthError: string,
    message: string
  ) {
    super(message);
    this.name = "ApplicationAuthBoundaryError";
  }
}

export const applicationAuthHttpPlugin: FastifyPluginAsync<
  ApplicationAuthHttpPluginOptions
> = async (instance, options) => {
  const resourceGuard = new ApplicationOAuthResourcePolicyGuard(
    options.kernel.repository.applicationOAuthClient
  );

  instance.removeContentTypeParser("application/json");
  const rawParser = (
    _request: FastifyRequest,
    body: Buffer,
    done: (error: Error | null, body?: Buffer) => void
  ) => done(null, body);
  instance.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: APPLICATION_AUTH_BODY_LIMIT },
    rawParser
  );
  instance.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "buffer", bodyLimit: APPLICATION_AUTH_BODY_LIMIT },
    rawParser
  );
  instance.addContentTypeParser(
    "*",
    { parseAs: "buffer", bodyLimit: APPLICATION_AUTH_BODY_LIMIT },
    rawParser
  );

  instance.setErrorHandler(async (error, request, reply) => {
    const known = classifyBoundaryError(error);
    const requestId = String(request.id);
    const logContext = {
      requestId,
      method: request.method,
      path: request.routeOptions?.url,
      statusCode: known.statusCode,
      reason: known.reason,
    };
    if (known.statusCode >= 500) {
      request.log.error(logContext, "Application auth request failed");
    } else {
      request.log.warn(logContext, "Application auth request rejected");
    }
    reply
      .code(known.statusCode)
      .header("cache-control", "no-store")
      .header("pragma", "no-cache")
      .header("x-request-id", requestId)
      .type("application/json; charset=utf-8");
    await reply.send({
      error: known.oauthError,
      error_description: known.publicMessage,
      request_id: requestId,
    });
  });

  instance.route<{ Params: ApplicationAuthRouteParams }>({
    method: ["GET", "POST", "OPTIONS"],
    url: "/auth/applications/:applicationId/*",
    exposeHeadRoute: false,
    bodyLimit: APPLICATION_AUTH_BODY_LIMIT,
    handler: async (request, reply) => {
      const raw = readRawApplicationAuthRequest(request);
      const applicationId = parseCanonicalApplicationId(
        request.params.applicationId
      );
      const prefix = `/auth/applications/${applicationId}`;
      if (
        !raw.rawPath.startsWith(`${prefix}/`) ||
        raw.rawPath.length <= prefix.length
      ) {
        throw notFound();
      }
      const normalizedPath = normalizeApplicationAuthRelativePath(
        raw.rawPath.slice(prefix.length)
      );
      const runtime = await loadActiveRuntime(
        options.kernel,
        applicationId,
        routeRequiresForcedRevisionCheck(normalizedPath)
      );

      if (request.method === "OPTIONS") {
        validateApplicationAuthRequestBody({
          method: "GET",
          normalizedPath,
          raw,
          contentEncoding: request.headers["content-encoding"],
        });
        await handlePreflight(
          request,
          reply,
          runtime,
          normalizedPath,
          options.publicBaseUrl
        );
        return;
      }
      if (
        !isApplicationAuthRouteAllowed(
          runtime.routeManifest,
          request.method,
          normalizedPath
        )
      ) {
        throw notFound();
      }

      const allowedOrigin = assertAllowedOrigin(
        request,
        runtime,
        options.publicBaseUrl,
        normalizedPath.startsWith("/callback/")
      );
      applyCorsResponseHeaders(reply, allowedOrigin);
      reply.header("x-request-id", String(request.id));
      validateApplicationAuthRequestBody({
        method: request.method,
        normalizedPath,
        raw,
        contentEncoding: request.headers["content-encoding"],
      });
      assertEffectiveRequestPolicy(runtime, normalizedPath, raw);
      await resourceGuard.assertRequest({
        applicationId,
        resource: runtime.resource,
        method: request.method,
        normalizedPath,
        rawQuery: raw.rawQuery,
        rawBody: raw.body,
        authorizationHeader: request.headers.authorization,
      });

      const fetchRequest = createApplicationAuthFetchRequest({
        request,
        raw,
        publicBaseUrl: options.publicBaseUrl,
      });
      let response = await runtime.auth.handler(fetchRequest);
      if (
        normalizedPath === "/.well-known/openid-configuration" ||
        normalizedPath === "/.well-known/oauth-authorization-server"
      ) {
        response = await enforceApplicationOAuthMetadata(response, {
          applicationId,
          publicBaseUrl: options.publicBaseUrl,
          oidc: normalizedPath === "/.well-known/openid-configuration",
        });
      }
      await sendApplicationAuthFetchResponse(response, reply);
    },
  });

  instance.route<{ Params: Pick<ApplicationAuthRouteParams, "applicationId"> }>({
    method: "GET",
    url: "/.well-known/oauth-authorization-server/auth/applications/:applicationId",
    exposeHeadRoute: false,
    handler: async (request, reply) => {
      const raw = readRawApplicationAuthRequest(request);
      const applicationId = parseCanonicalApplicationId(
        request.params.applicationId
      );
      const expectedPath =
        `/.well-known/oauth-authorization-server/auth/applications/${applicationId}`;
      if (raw.rawPath !== expectedPath) throw notFound();
      validateApplicationAuthRequestBody({
        method: request.method,
        normalizedPath: "/.well-known/oauth-authorization-server",
        raw,
        contentEncoding: request.headers["content-encoding"],
      });
      const runtime = await loadActiveRuntime(
        options.kernel,
        applicationId,
        false
      );
      const allowedOrigin = assertAllowedOrigin(
        request,
        runtime,
        options.publicBaseUrl
      );
      applyCorsResponseHeaders(reply, allowedOrigin);
      reply.header("x-request-id", String(request.id));

      const fetchRequest = createApplicationAuthFetchRequest({
        request,
        raw,
        publicBaseUrl: options.publicBaseUrl,
      });
      const pluginResponse = await runtime.auth.handler(fetchRequest);
      const response = await enforceApplicationOAuthMetadata(pluginResponse, {
        applicationId,
        publicBaseUrl: options.publicBaseUrl,
        oidc: false,
      });
      await sendApplicationAuthFetchResponse(response, reply);
    },
  });
};

async function loadActiveRuntime(
  kernel: Kernel,
  applicationId: string,
  forceRevisionCheck: boolean
): Promise<ApplicationAuthFactoryRuntime> {
  const configuration =
    await kernel.repository.applicationAuthConfiguration.findActive(
      applicationId
    );
  if (!configuration) throw notFound();
  return kernel.applicationAuth.forApplication(applicationId, {
    forceRevisionCheck,
  });
}

async function handlePreflight(
  request: FastifyRequest,
  reply: FastifyReply,
  runtime: ApplicationAuthFactoryRuntime,
  normalizedPath: string,
  publicBaseUrl: string
): Promise<void> {
  const origin = assertAllowedOrigin(
    request,
    runtime,
    publicBaseUrl,
    false,
    true
  );
  const requestedMethod = request.headers["access-control-request-method"];
  if (
    typeof requestedMethod !== "string" ||
    !assertApplicationAuthPreflightMethod(
      runtime.routeManifest,
      requestedMethod,
      normalizedPath
    )
  ) {
    throw notFound();
  }

  const requestedHeaders = parseRequestedCorsHeaders(
    request.headers["access-control-request-headers"]
  );
  applyCorsResponseHeaders(reply, origin);
  reply
    .code(204)
    .header("access-control-allow-methods", requestedMethod.toUpperCase())
    .header("access-control-max-age", "600")
    .header("x-request-id", String(request.id));
  if (requestedHeaders.length > 0) {
    reply.header("access-control-allow-headers", requestedHeaders.join(", "));
  }
  await reply.send();
}

function assertAllowedOrigin(
  request: FastifyRequest,
  runtime: ApplicationAuthFactoryRuntime,
  publicBaseUrl: string,
  allowCrossSiteNavigation = false,
  required = false
): string | undefined {
  const origin = request.headers.origin;
  if (origin === undefined && !required) return undefined;
  if (
    typeof origin === "string" &&
    (origin === publicBaseUrl || runtime.trustedOrigins.includes(origin))
  ) {
    return origin;
  }
  if (typeof origin === "string" && allowCrossSiteNavigation && !required) {
    return undefined;
  }
  throw new ApplicationAuthBoundaryError(
    403,
    "access_denied",
    "Request origin is not allowed"
  );
}

function applyCorsResponseHeaders(
  reply: FastifyReply,
  origin: string | undefined
): void {
  if (!origin) return;
  reply
    .header("vary", "Origin")
    .header("access-control-allow-origin", origin)
    .header("access-control-allow-credentials", "true");
}

function parseRequestedCorsHeaders(
  value: string | string[] | undefined
): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) {
    throw new ApplicationAuthBoundaryError(
      400,
      "invalid_request",
      "Duplicate CORS request header is invalid"
    );
  }
  const headers = value
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  if (
    new Set(headers).size !== headers.length ||
    headers.some((header) => !ALLOWED_CORS_REQUEST_HEADERS.has(header))
  ) {
    throw new ApplicationAuthBoundaryError(
      403,
      "access_denied",
      "CORS request headers are not allowed"
    );
  }
  return headers;
}

function assertEffectiveRequestPolicy(
  runtime: ApplicationAuthFactoryRuntime,
  normalizedPath: string,
  raw: RawApplicationAuthRequest
): void {
  if (normalizedPath === "/sign-in/social") {
    if (!raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const provider = parseJsonBody(raw.body).provider;
    if (
      typeof provider !== "string" ||
      !runtime.routeManifest.allowedSocialProviders.includes(
        provider as "google" | "facebook"
      )
    ) {
      throw notFound();
    }
  }
  if (normalizedPath === "/email-otp/send-verification-otp") {
    if (!raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    if (parseJsonBody(raw.body).type !== "sign-in") throw notFound();
  }
}

function parseCanonicalApplicationId(value: string): string {
  const result = z.string().uuid().safeParse(value);
  if (!result.success || result.data !== result.data.toLowerCase()) {
    throw notFound();
  }
  return result.data;
}

function notFound(): ApplicationAuthBoundaryError {
  return new ApplicationAuthBoundaryError(
    404,
    "not_found",
    "Application auth endpoint was not found"
  );
}

function classifyBoundaryError(error: Error): {
  statusCode: number;
  oauthError: string;
  publicMessage: string;
  reason: string;
} {
  if (
    error instanceof ApplicationAuthBoundaryError ||
    error instanceof ApplicationAuthRequestError ||
    error instanceof ApplicationOAuthResourcePolicyError
  ) {
    return {
      statusCode: error.statusCode,
      oauthError: error.oauthError,
      publicMessage: error.message,
      reason: error.name,
    };
  }
  if (error instanceof ApplicationAuthPathError) {
    return {
      statusCode: 400,
      oauthError: "invalid_request",
      publicMessage: error.message,
      reason: error.name,
    };
  }
  const fastifyError = error as Error & {
    code?: string;
    statusCode?: number;
  };
  if (fastifyError.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
    return {
      statusCode: 413,
      oauthError: "invalid_request",
      publicMessage: "Request body is too large",
      reason: fastifyError.code,
    };
  }
  if (
    fastifyError.statusCode !== undefined &&
    fastifyError.statusCode >= 400 &&
    fastifyError.statusCode < 500
  ) {
    return {
      statusCode: 400,
      oauthError: "invalid_request",
      publicMessage: "Application auth request is malformed or unsupported",
      reason: fastifyError.code ?? error.name,
    };
  }
  return {
    statusCode: 500,
    oauthError: "server_error",
    publicMessage: "Application auth request could not be completed",
    reason: error.name || "Error",
  };
}
