import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { z } from "zod";
import type { ApplicationAuthFactoryRuntime } from "../../../auth/ApplicationAuthFactory.js";
import {
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "../../../auth/applicationSocialProviders.js";
import type { Kernel } from "../../../kernel/Kernel.js";
import type { ApplicationAuthAuditReasonCategory } from "../../../services/ApplicationAuthAuditService.js";
import { ApplicationAuthRateLimitError } from "../../../services/ApplicationAuthRateLimiter.js";
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
  parseRawSearchParams,
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
  resolveAllowedSocialCallbackProvider,
  routeRequiresForcedRevisionCheck,
} from "./routeManifest.js";
import { ApplicationAuthHostedUiController } from "./ui/ApplicationAuthHostedUiController.js";

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
const NORMALIZED_EMAIL_JSON_ROUTES = new Set([
  "/email-otp/send-verification-otp",
  "/request-password-reset",
  "/send-verification-email",
  "/sign-in/email",
  "/sign-in/email-otp",
  "/sign-up/email",
]);
const OTP_GENERIC_RESPONSE_FLOOR_MS = 250;

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
  const hostedUi = new ApplicationAuthHostedUiController(options.kernel);

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
    if (acceptsHostedUiHtml(request)) {
      reply
        .code(known.statusCode)
        .header("cache-control", "no-store")
        .header("pragma", "no-cache")
        .header(
          "content-security-policy",
          "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
        )
        .header("x-content-type-options", "nosniff")
        .header("referrer-policy", "no-referrer")
        .header("x-request-id", requestId)
        .type("text/html; charset=utf-8");
      if (known.retryAfterSeconds !== undefined) {
        reply.header("retry-after", String(known.retryAfterSeconds));
      }
      await reply.send(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authentication unavailable</title></head><body><main><h1>Authentication unavailable</h1><p>This authentication request is unavailable or has expired.</p></main></body></html>'
      );
      return;
    }
    reply
      .code(known.statusCode)
      .header("cache-control", "no-store")
      .header("pragma", "no-cache")
      .header("x-request-id", requestId)
      .type("application/json; charset=utf-8");
    if (known.retryAfterSeconds !== undefined) {
      reply.header("retry-after", String(known.retryAfterSeconds));
    }
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
      let raw = readRawApplicationAuthRequest(request);
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
          socialCallback: false,
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
      const socialCallbackProvider =
        resolveAllowedSocialCallbackProvider({
          method: request.method,
          normalizedPath,
          manifest: runtime.routeManifest,
        });

      const allowedOrigin = assertAllowedOrigin(
        request,
        runtime,
        options.publicBaseUrl,
        socialCallbackProvider !== null
      );
      applyCorsResponseHeaders(reply, allowedOrigin);
      reply.header("x-request-id", String(request.id));
      validateApplicationAuthRequestBody({
        method: request.method,
        normalizedPath,
        socialCallback: socialCallbackProvider !== null,
        raw,
        contentEncoding: request.headers["content-encoding"],
      });
      raw = normalizeApplicationAuthEmailBody(normalizedPath, raw);
      assertSupportedOAuthGrantType(normalizedPath, raw);
      if (hostedUi.isRoute(request.method, normalizedPath)) {
        try {
          if (
            await hostedUi.handle({
              request,
              reply,
              raw,
              normalizedPath,
              runtime,
              publicBaseUrl: options.publicBaseUrl,
            })
          ) {
            return;
          }
        } catch (error) {
          request.log.warn(
            {
              requestId: String(request.id),
              method: request.method,
              path: normalizedPath,
              reason: error instanceof Error ? error.name : "Error",
            },
            "Hosted application authentication request rejected"
          );
          await hostedUi.handleError({
            reply,
            runtime,
            error: error instanceof Error ? error : new Error("Unknown error"),
          });
          return;
        }
      }
      assertEffectiveRequestPolicy(runtime, normalizedPath, raw);
      await assertApplicationAuthRateLimit({
        kernel: options.kernel,
        request,
        runtime,
        normalizedPath,
        raw,
      });
      await assertPhoneOtpUserCanSignIn({
        kernel: options.kernel,
        runtime,
        normalizedPath,
        raw,
      });
      await resourceGuard.assertRequest({
        applicationId,
        resource: runtime.resource,
        method: request.method,
        normalizedPath,
        rawQuery: raw.rawQuery,
        rawBody: raw.body,
        authorizationHeader: request.headers.authorization,
      });
      if (normalizedPath === "/oauth2/token") {
        await assertRefreshGrantLiveState({
          kernel: options.kernel,
          runtime,
          raw,
          authorizationHeader: request.headers.authorization,
        });
      }
      if (normalizedPath === "/oauth2/userinfo") {
        await assertUserInfoLiveState({
          kernel: options.kernel,
          runtime,
          authorizationHeader: request.headers.authorization,
        });
      }

      const fetchRequest = createApplicationAuthFetchRequest({
        request,
        raw,
        publicBaseUrl: options.publicBaseUrl,
      });
      const otpStartedAt =
        normalizedPath === "/email-otp/send-verification-otp" ||
        normalizedPath === "/phone-number/send-otp"
          ? Date.now()
          : undefined;
      let response: Response;
      try {
        response = await runtime.auth.handler(fetchRequest);
      } catch (error) {
        if (socialCallbackProvider) {
          await options.kernel.applicationAuthAudit.record({
            action: "provider_callback",
            outcome: "failure",
            reasonCategory: "provider_error",
            actorType: "anonymous",
            organizationId: runtime.organizationId,
            applicationId: runtime.applicationId,
            secretKeyVersion: runtime.secretKeyVersion,
            requestId: String(request.id),
            provider: socialCallbackProvider,
          });
        }
        if (otpStartedAt !== undefined) {
          await waitForOtpGenericResponseFloor(otpStartedAt);
          throw otpDeliveryUnavailable();
        }
        throw error;
      }
      response = await normalizeSensitiveApplicationAuthResponse(
        normalizedPath,
        response,
        otpStartedAt
      );
      if (normalizedPath === "/oauth2/introspect") {
        response = await applyApplicationTokenIntrospection({
          kernel: options.kernel,
          runtime,
          raw,
          authorizationHeader: request.headers.authorization,
          response,
        });
      }
      if (normalizedPath === "/oauth2/revoke" && response.ok) {
        await recordApplicationTokenRevocation({
          kernel: options.kernel,
          runtime,
          raw,
          authorizationHeader: request.headers.authorization,
        });
      }
      if (socialCallbackProvider) {
        await auditSocialProviderCallback({
          kernel: options.kernel,
          runtime,
          provider: socialCallbackProvider,
          requestId: String(request.id),
          response,
        });
      }
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
        socialCallback: false,
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

function acceptsHostedUiHtml(request: FastifyRequest): boolean {
  const accept = request.headers.accept;
  if (typeof accept !== "string" || !accept.includes("text/html")) return false;
  const rawPath = request.raw.url?.split("?", 1)[0] ?? "";
  return /\/auth\/applications\/[^/]+\/(?:login|signup|email-otp|consent|logout|error|password\/|verification-|verified|account-created|account\/)/u.test(
    rawPath
  );
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
  if (normalizedPath === "/sign-up/email") {
    if (!raw.body) {
      throw new ApplicationAuthRequestError("JSON body is required");
    }
    const body = parseJsonBody(raw.body);
    if ("phoneNumber" in body || "phoneNumberVerified" in body) {
      throw new ApplicationAuthRequestError(
        "Phone identity fields cannot be set during email sign-up"
      );
    }
  }
  if (normalizedPath === "/sign-in/social") {
    if (!raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const body = parseJsonBody(raw.body);
    const keys = Object.keys(body).sort();
    if (
      keys.length !== 2 ||
      keys[0] !== "oauth_query" ||
      keys[1] !== "provider" ||
      typeof body.oauth_query !== "string" ||
      body.oauth_query.length < 32 ||
      body.oauth_query.length > 16_384
    ) {
      throw new ApplicationAuthRequestError(
        "Social sign-in request is invalid"
      );
    }
    let provider: ApplicationAuthProviderName;
    try {
      provider = parseApplicationAuthProviderName(body.provider);
    } catch {
      throw notFound();
    }
    if (!runtime.routeManifest.allowedSocialProviders.includes(provider)) {
      throw notFound();
    }
  }
  if (normalizedPath === "/email-otp/send-verification-otp") {
    if (!raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const body = parseJsonBody(raw.body);
    if (body.type !== "sign-in") throw notFound();
    parseApplicationAuthEmail(body.email);
  }
  if (normalizedPath === "/sign-in/email-otp") {
    if (!raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const body = parseJsonBody(raw.body);
    parseApplicationAuthEmail(body.email);
    if (typeof body.otp !== "string" || !/^\d{6}$/u.test(body.otp)) {
      throw new ApplicationAuthRequestError("Email OTP is invalid");
    }
  }
  if (normalizedPath === "/phone-number/send-otp") {
    if (!raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    parseApplicationAuthPhone(parseJsonBody(raw.body).phoneNumber);
  }
  if (normalizedPath === "/phone-number/verify") {
    if (!raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const body = parseJsonBody(raw.body);
    parseApplicationAuthPhone(body.phoneNumber);
    if (typeof body.code !== "string" || !/^\d{6}$/u.test(body.code)) {
      throw new ApplicationAuthRequestError("Phone OTP is invalid");
    }
  }
}

async function auditSocialProviderCallback(input: {
  kernel: Kernel;
  runtime: ApplicationAuthFactoryRuntime;
  provider: ApplicationAuthProviderName;
  requestId: string;
  response: Response;
}): Promise<void> {
  const location = input.response.headers.get("location");
  let target: URL | null = null;
  try {
    target = location ? new URL(location, input.runtime.issuer) : null;
  } catch {
    target = null;
  }
  const errorCode = target?.searchParams.get("error") ?? null;
  const callbackSucceeded =
    input.response.status >= 300 &&
    input.response.status < 400 &&
    target !== null &&
    errorCode === null;
  const reasonCategory = callbackSucceeded
    ? "success"
    : mapSocialCallbackAuditReason(errorCode);
  await input.kernel.applicationAuthAudit.record({
    action: "provider_callback",
    outcome: callbackSucceeded ? "success" : "failure",
    reasonCategory,
    actorType: "anonymous",
    organizationId: input.runtime.organizationId,
    applicationId: input.runtime.applicationId,
    secretKeyVersion: input.runtime.secretKeyVersion,
    requestId: input.requestId,
    provider: input.provider,
  });

  const connectionsPath = `/auth/applications/${input.runtime.applicationId}/account/connections`;
  if (target?.origin !== new URL(input.runtime.issuer).origin) return;
  if (target.pathname !== connectionsPath) return;
  await input.kernel.applicationAuthAudit.record({
    action: "account_link",
    outcome: callbackSucceeded ? "success" : "failure",
    reasonCategory,
    actorType: "application_user",
    organizationId: input.runtime.organizationId,
    applicationId: input.runtime.applicationId,
    secretKeyVersion: input.runtime.secretKeyVersion,
    requestId: input.requestId,
    provider: input.provider,
  });
}

function mapSocialCallbackAuditReason(
  errorCode: string | null
): ApplicationAuthAuditReasonCategory {
  switch (errorCode) {
    case "email_not_found":
      return "provider_email_missing";
    case "signup_disabled":
      return "registration_disabled";
    case "account_not_linked":
      return "implicit_linking_blocked";
    case "email_doesn't_match":
      return "email_mismatch";
    case "account_already_linked_to_different_user":
      return "account_conflict";
    case "unable_to_link_account":
      return "linking_failed";
    case "state_mismatch":
    case "state_not_found":
    case "state_invalid":
      return "callback_state_invalid";
    default:
      return errorCode ? "provider_error" : "unknown";
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
  retryAfterSeconds?: number;
} {
  if (
    error instanceof ApplicationAuthBoundaryError ||
    error instanceof ApplicationAuthRequestError ||
    error instanceof ApplicationOAuthResourcePolicyError ||
    error instanceof ApplicationAuthRateLimitError
  ) {
    return {
      statusCode: error.statusCode,
      oauthError: error.oauthError,
      publicMessage: error.message,
      reason: error.name,
      ...(error instanceof ApplicationAuthRateLimitError
        ? { retryAfterSeconds: error.retryAfterSeconds }
        : {}),
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

async function assertApplicationAuthRateLimit(input: {
  kernel: Kernel;
  request: FastifyRequest;
  runtime: ApplicationAuthFactoryRuntime;
  normalizedPath: string;
  raw: RawApplicationAuthRequest;
}): Promise<void> {
  const secret = input.kernel.applicationAuthSecrets.derivePurposeSecret(
    input.runtime.applicationId,
    input.runtime.secretKeyVersion,
    "rate-limit"
  );
  if (input.normalizedPath === "/oauth2/authorize") {
    const clientId = requireSingleParameter(
      parseRawSearchParams(input.raw.rawQuery),
      "client_id",
      512
    );
    await input.kernel.applicationAuthRateLimiter.assertAuthorize({
      applicationId: input.runtime.applicationId,
      clientId,
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (input.normalizedPath === "/email-otp/send-verification-otp") {
    if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const email = parseApplicationAuthEmail(
      parseJsonBody(input.raw.body).email
    );
    await input.kernel.applicationAuthRateLimiter.assertEmailOtpRequest({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email,
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (input.normalizedPath === "/sign-in/email-otp") {
    if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const email = parseApplicationAuthEmail(
      parseJsonBody(input.raw.body).email
    );
    await input.kernel.applicationAuthRateLimiter.assertEmailOtpVerify({
      applicationId: input.runtime.applicationId,
      verificationId: `sign-in-otp-${email}`,
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (input.normalizedPath === "/phone-number/send-otp") {
    if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const phoneNumber = parseApplicationAuthPhone(
      parseJsonBody(input.raw.body).phoneNumber
    );
    await input.kernel.applicationAuthRateLimiter.assertPhoneOtpRequest({
      applicationId: input.runtime.applicationId,
      phoneNumber,
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (input.normalizedPath === "/phone-number/verify") {
    if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const phoneNumber = parseApplicationAuthPhone(
      parseJsonBody(input.raw.body).phoneNumber
    );
    await input.kernel.applicationAuthRateLimiter.assertPhoneOtpVerify({
      applicationId: input.runtime.applicationId,
      phoneNumber,
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (input.normalizedPath === "/oauth2/token") {
    if (!input.raw.body) throw new ApplicationAuthRequestError("Token body is required");
    const form = parseRawSearchParams(input.raw.body.toString("utf8"));
    const formClientId = optionalSingleParameter(form, "client_id", 512);
    const basicClientId = readBasicClientId(input.request.headers.authorization);
    if (formClientId && basicClientId && formClientId !== basicClientId) {
      throw new ApplicationAuthRequestError("Conflicting OAuth client identifiers");
    }
    const clientId = formClientId ?? basicClientId;
    if (!clientId) throw new ApplicationAuthRequestError("OAuth client is required");
    await input.kernel.applicationAuthRateLimiter.assertToken({
      applicationId: input.runtime.applicationId,
      clientId,
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (input.normalizedPath === "/sign-in/email") {
    if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const email = parseJsonBody(input.raw.body).email;
    if (typeof email !== "string" || email.length > 320) {
      throw new ApplicationAuthRequestError("Email is invalid");
    }
    await input.kernel.applicationAuthRateLimiter.assertPasswordSignIn({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email.trim().toLowerCase(),
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (input.normalizedPath === "/sign-up/email") {
    if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const email = parseJsonBody(input.raw.body).email;
    if (typeof email !== "string" || email.length > 320) {
      throw new ApplicationAuthRequestError("Email is invalid");
    }
    await input.kernel.applicationAuthRateLimiter.assertPasswordSignUp({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email.trim().toLowerCase(),
      ip: input.request.ip,
      secret,
    });
    return;
  }
  if (
    input.normalizedPath === "/request-password-reset" ||
    input.normalizedPath === "/send-verification-email"
  ) {
    if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
    const email = parseJsonBody(input.raw.body).email;
    if (typeof email !== "string" || email.length > 320) {
      throw new ApplicationAuthRequestError("Email is invalid");
    }
    await input.kernel.applicationAuthRateLimiter.assertPasswordReset({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email.trim().toLowerCase(),
      ip: input.request.ip,
      secret,
    });
  }
}

async function normalizeSensitiveApplicationAuthResponse(
  normalizedPath: string,
  response: Response,
  otpStartedAt?: number
): Promise<Response> {
  if (normalizedPath === "/sign-in/email" && !response.ok) {
    return replaceJsonResponse(response, 401, {
      error: "invalid_credentials",
      error_description: "Email or password is invalid",
    });
  }
  if (normalizedPath === "/sign-up/email" && !response.ok) {
    return replaceJsonResponse(response, 400, {
      error: "invalid_signup",
      error_description: "Account could not be created",
    });
  }
  if (
    normalizedPath === "/request-password-reset" ||
    normalizedPath === "/send-verification-email"
  ) {
    return replaceJsonResponse(response, 202, {
      status: true,
      message: "If the account exists, an authentication message will be sent",
    });
  }
  if (normalizedPath === "/email-otp/send-verification-otp") {
    if (otpStartedAt !== undefined) {
      await waitForOtpGenericResponseFloor(otpStartedAt);
    }
    return response.ok
      ? replaceJsonResponse(response, 202, {
          status: true,
          message:
            "If the email can sign in, an authentication code will be sent",
        })
      : response.status === 429
        ? replaceJsonResponse(response, 429, {
            error: "slow_down",
            error_description: "Authentication request rate limit exceeded",
          })
        : replaceJsonResponse(response, 503, {
            error: "temporarily_unavailable",
            error_description: "Authentication message could not be accepted",
          });
  }
  if (normalizedPath === "/sign-in/email-otp" && !response.ok) {
    return replaceJsonResponse(response, 401, {
      error: "invalid_code",
      error_description: "Email or code is invalid",
    });
  }
  if (normalizedPath === "/phone-number/send-otp") {
    if (otpStartedAt !== undefined) {
      await waitForOtpGenericResponseFloor(otpStartedAt);
    }
    return response.ok
      ? replaceJsonResponse(response, 200, {
          status: true,
          message: "If the phone can sign in, an authentication code will be sent",
        })
      : response.status === 429
        ? replaceJsonResponse(response, 429, {
            error: "slow_down",
            error_description: "Authentication request rate limit exceeded",
          })
        : replaceJsonResponse(response, 503, {
            error: "temporarily_unavailable",
            error_description: "Authentication message could not be accepted",
          });
  }
  if (normalizedPath === "/phone-number/verify" && !response.ok) {
    return replaceJsonResponse(response, 401, {
      error: "invalid_code",
      error_description: "Phone or code is invalid",
    });
  }
  return response;
}

async function assertPhoneOtpUserCanSignIn(input: {
  kernel: Kernel;
  runtime: ApplicationAuthFactoryRuntime;
  normalizedPath: string;
  raw: RawApplicationAuthRequest;
}): Promise<void> {
  if (input.normalizedPath !== "/phone-number/verify") return;
  if (!input.raw.body) throw new ApplicationAuthRequestError("JSON body is required");
  const phoneNumber = parseApplicationAuthPhone(
    parseJsonBody(input.raw.body).phoneNumber
  );
  const user = await input.kernel.repository.applicationUser
    .forApplication(input.runtime.applicationId)
    .findByPhoneNumber(phoneNumber);
  if (user?.status === "blocked") {
    throw new ApplicationAuthBoundaryError(
      401,
      "invalid_code",
      "Phone or code is invalid"
    );
  }
}

async function assertRefreshGrantLiveState(input: {
  kernel: Kernel;
  runtime: ApplicationAuthFactoryRuntime;
  raw: RawApplicationAuthRequest;
  authorizationHeader: string | undefined;
}): Promise<void> {
  const form = requireOAuthProtocolForm(input.raw);
  if (optionalSingleParameter(form, "grant_type", 64) !== "refresh_token") {
    return;
  }
  const clientId = requireProtocolClientId(form, input.authorizationHeader);
  const token = requireSingleParameter(form, "refresh_token", 16 * 1024);
  const result = await input.kernel.applicationTokenValidation.validateRefreshGrant(
    {
      token,
      expectedApplicationId: input.runtime.applicationId,
      expectedAudience: input.runtime.resource,
      expectedClientId: clientId,
    }
  );
  if (
    !result.active &&
    result.reasonCategory !== "token_family_revoked"
  ) {
    throw new ApplicationAuthBoundaryError(
      400,
      "invalid_grant",
      "Refresh token is invalid or inactive"
    );
  }
}

async function assertUserInfoLiveState(input: {
  kernel: Kernel;
  runtime: ApplicationAuthFactoryRuntime;
  authorizationHeader: string | undefined;
}): Promise<void> {
  const match = /^Bearer ([^\s]+)$/iu.exec(input.authorizationHeader ?? "");
  if (!match) {
    throw new ApplicationAuthBoundaryError(
      401,
      "invalid_token",
      "Access token is invalid or inactive"
    );
  }
  const result = await input.kernel.applicationTokenValidation.validateAccessToken({
    token: match[1]!,
    expectedApplicationId: input.runtime.applicationId,
    expectedAudience: input.runtime.resource,
  });
  if (!result.active) {
    throw new ApplicationAuthBoundaryError(
      401,
      "invalid_token",
      "Access token is invalid or inactive"
    );
  }
}

function assertSupportedOAuthGrantType(
  normalizedPath: string,
  raw: RawApplicationAuthRequest
): void {
  if (normalizedPath !== "/oauth2/token" || !raw.body) return;
  const form = requireOAuthProtocolForm(raw);
  const grantType = optionalSingleParameter(form, "grant_type", 64);
  if (
    grantType &&
    grantType !== "authorization_code" &&
    grantType !== "client_credentials" &&
    grantType !== "refresh_token"
  ) {
    throw new ApplicationAuthBoundaryError(
      400,
      "unsupported_grant_type",
      "OAuth grant type is unsupported"
    );
  }
}

async function applyApplicationTokenIntrospection(input: {
  kernel: Kernel;
  runtime: ApplicationAuthFactoryRuntime;
  raw: RawApplicationAuthRequest;
  authorizationHeader: string | undefined;
  response: Response;
}): Promise<Response> {
  if (!input.response.ok) {
    if (input.response.status >= 500) {
      return replaceJsonResponse(input.response, 200, { active: false });
    }
    if (input.response.status === 400) {
      const form = requireOAuthProtocolForm(input.raw);
      if (optionalSingleParameter(form, "token", 16 * 1024)) {
        return replaceJsonResponse(input.response, 200, { active: false });
      }
    }
    return input.response;
  }
  let pluginResult: unknown;
  try {
    pluginResult = await input.response.clone().json();
  } catch {
    return replaceJsonResponse(input.response, 200, { active: false });
  }
  if (
    !pluginResult ||
    typeof pluginResult !== "object" ||
    (pluginResult as { active?: unknown }).active !== true
  ) {
    return replaceJsonResponse(input.response, 200, { active: false });
  }
  const form = requireOAuthProtocolForm(input.raw);
  const clientId = requireProtocolClientId(form, input.authorizationHeader);
  const token = requireSingleParameter(form, "token", 16 * 1024);
  const result = await input.kernel.applicationTokenValidation.validate({
    token,
    expectedApplicationId: input.runtime.applicationId,
    expectedAudience: input.runtime.resource,
  });
  if (!result.active || result.clientId !== clientId) {
    return replaceJsonResponse(input.response, 200, { active: false });
  }
  return replaceJsonResponse(input.response, 200, {
    active: true,
    client_id: result.clientId,
    sub: result.userId,
    sid: result.sessionId,
    scope: result.scopes.join(" "),
    exp: Math.floor(result.expiresAt.getTime() / 1_000),
    iat: Math.floor(result.issuedAt.getTime() / 1_000),
    iss: result.issuer,
    aud: result.audience,
    application_id: result.applicationId,
    actor_type: result.actorType,
  });
}

async function recordApplicationTokenRevocation(input: {
  kernel: Kernel;
  runtime: ApplicationAuthFactoryRuntime;
  raw: RawApplicationAuthRequest;
  authorizationHeader: string | undefined;
}): Promise<void> {
  const form = requireOAuthProtocolForm(input.raw);
  const clientId = requireProtocolClientId(form, input.authorizationHeader);
  const token = requireSingleParameter(form, "token", 16 * 1024);
  const tokenTypeHint = optionalSingleParameter(form, "token_type_hint", 64);
  if (
    tokenTypeHint !== null &&
    tokenTypeHint !== "access_token" &&
    tokenTypeHint !== "refresh_token"
  ) {
    return;
  }
  await input.kernel.applicationTokenValidation.recordProtocolRevocation({
    token,
    expectedApplicationId: input.runtime.applicationId,
    expectedAudience: input.runtime.resource,
    expectedClientId: clientId,
    ...(tokenTypeHint ? { tokenTypeHint } : {}),
  });
}

function requireOAuthProtocolForm(
  raw: RawApplicationAuthRequest
): URLSearchParams {
  if (!raw.body) {
    throw new ApplicationAuthRequestError("OAuth protocol body is required");
  }
  return parseRawSearchParams(raw.body.toString("utf8"));
}

function requireProtocolClientId(
  form: URLSearchParams,
  authorizationHeader: string | undefined
): string {
  const formClientId = optionalSingleParameter(form, "client_id", 512);
  const basicClientId = readBasicClientId(authorizationHeader);
  if (formClientId && basicClientId && formClientId !== basicClientId) {
    throw new ApplicationAuthRequestError(
      "Conflicting OAuth client identifiers"
    );
  }
  const clientId = formClientId ?? basicClientId;
  if (!clientId) {
    throw new ApplicationAuthRequestError("OAuth client is required");
  }
  return clientId;
}

function replaceJsonResponse(
  response: Response,
  status: number,
  body: Record<string, unknown>
): Response {
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.delete("content-length");
  return new Response(JSON.stringify(body), { status, headers });
}

function requireSingleParameter(
  params: URLSearchParams,
  name: string,
  maxLength: number
): string {
  const value = optionalSingleParameter(params, name, maxLength);
  if (!value) throw new ApplicationAuthRequestError(`${name} is required`);
  return value;
}

function optionalSingleParameter(
  params: URLSearchParams,
  name: string,
  maxLength: number
): string | null {
  const values = params.getAll(name);
  if (values.length === 0) return null;
  if (values.length !== 1 || !values[0] || values[0].length > maxLength) {
    throw new ApplicationAuthRequestError(`${name} is invalid`);
  }
  return values[0];
}

function readBasicClientId(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Basic ([A-Za-z0-9+/]+=*)$/u.exec(header);
  if (!match) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(match[1]!, "base64").toString("utf8");
  } catch {
    throw new ApplicationAuthRequestError("OAuth client authentication is invalid");
  }
  const separator = decoded.indexOf(":");
  if (separator < 1) {
    throw new ApplicationAuthRequestError("OAuth client authentication is invalid");
  }
  const clientId = decoded.slice(0, separator);
  if (clientId.length > 512 || clientId.includes("\0")) {
    throw new ApplicationAuthRequestError("OAuth client authentication is invalid");
  }
  return clientId;
}

function parseApplicationAuthEmail(value: unknown): string {
  const parsed = z.string().trim().email().max(320).safeParse(value);
  if (!parsed.success) {
    throw new ApplicationAuthRequestError("Email is invalid");
  }
  return parsed.data.toLowerCase();
}

function parseApplicationAuthPhone(value: unknown): string {
  const parsed = z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/u).safeParse(value);
  if (!parsed.success) {
    throw new ApplicationAuthRequestError("Phone number is invalid");
  }
  return parsed.data;
}

function normalizeApplicationAuthEmailBody(
  normalizedPath: string,
  raw: RawApplicationAuthRequest
): RawApplicationAuthRequest {
  if (!raw.body || !NORMALIZED_EMAIL_JSON_ROUTES.has(normalizedPath)) {
    return raw;
  }
  const body = parseJsonBody(raw.body);
  if (typeof body.email !== "string") return raw;

  return {
    ...raw,
    body: Buffer.from(
      JSON.stringify({
        ...body,
        email: body.email.trim().toLowerCase(),
      }),
      "utf8"
    ),
  };
}

async function waitForOtpGenericResponseFloor(
  startedAt: number
): Promise<void> {
  const remaining =
    OTP_GENERIC_RESPONSE_FLOOR_MS - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}

function otpDeliveryUnavailable(): ApplicationAuthBoundaryError {
  return new ApplicationAuthBoundaryError(
    503,
    "temporarily_unavailable",
    "Authentication message could not be accepted"
  );
}
