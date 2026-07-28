import { createHash, timingSafeEqual } from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import type { FastifyRequest } from "fastify";
import type { ApplicationAuthFactoryRuntime } from "../../../../auth/ApplicationAuthFactory.js";
import type { ApplicationAuthProviderName } from "../../../../auth/applicationSocialProviders.js";
import type { ApplicationAuthSecretService } from "../../../../services/ApplicationAuthSecretService.js";
import type { ApplicationAuthorizationContextRepository } from "../../../../repositories/ApplicationAuthorizationContextRepository.js";
import type { ApplicationOAuthClientRepository } from "../../../../repositories/ApplicationOAuthClientRepository.js";
import type { ApplicationAuthorizationContext } from "../../../../repositories/models/application-auth.js";
import { ApplicationAuthRequestError } from "../rawRequestBridge.js";

const CONTEXT_TTL_SECONDS = 10 * 60;
const POST_LOGIN_RETURN_PATH = "/oauth2/continue";
const ALLOWED_SIGNED_QUERY_PARAMETERS = new Set([
  "client_id",
  "response_type",
  "redirect_uri",
  "scope",
  "state",
  "nonce",
  "code_challenge",
  "code_challenge_method",
  "resource",
  "prompt",
  "exp",
  "ba_iat",
  "ba_pl",
  "ba_param",
  "sig",
]);

export type ApplicationAuthorizationContextAction =
  | "password-signin"
  | "password-signup"
  | "password-reset-request"
  | "verification-resend"
  | "email-otp-request"
  | "email-otp-verify"
  | `social-signin:${ApplicationAuthProviderName}`
  | "consent";

export interface ActiveApplicationAuthorizationContext {
  opaqueId: string;
  context: ApplicationAuthorizationContext;
}

export class ApplicationAuthorizationContextService {
  constructor(
    private readonly contexts: ApplicationAuthorizationContextRepository,
    private readonly clients: ApplicationOAuthClientRepository,
    private readonly secrets: ApplicationAuthSecretService
  ) {}

  async captureSignedOAuthQuery(input: {
    runtime: ApplicationAuthFactoryRuntime;
    rawQuery: string;
    currentStep: "login" | "consent";
    sessionId?: string | null;
    previousOpaqueId?: string;
  }): Promise<ActiveApplicationAuthorizationContext> {
    const parsed = await this.verifySignedOAuthQuery(
      input.runtime,
      input.rawQuery
    );
    if (
      input.currentStep === "consent" &&
      (!input.sessionId || parsed.postLoginSessionId !== input.sessionId)
    ) {
      throw new ApplicationAuthRequestError(
        "Authorization context session is invalid"
      );
    }
    if (
      input.currentStep === "login" &&
      parsed.postLoginSessionId !== undefined
    ) {
      throw new ApplicationAuthRequestError(
        "Authorization context session is unexpected"
      );
    }
    const client = await this.clients.findActiveHostedUiClient(
      input.runtime.applicationId,
      parsed.clientId
    );
    if (!client || !client.redirectUris.includes(parsed.redirectUri)) {
      throw new ApplicationAuthRequestError(
        "Authorization context client is invalid"
      );
    }
    if (input.previousOpaqueId) {
      await this.contexts.consume(
        input.runtime.applicationId,
        input.previousOpaqueId
      );
    }
    const created = await this.contexts.create(input.runtime.applicationId, {
      clientId: parsed.clientId,
      redirectUri: parsed.redirectUri,
      postLoginReturnPath: POST_LOGIN_RETURN_PATH,
      state: parsed.state,
      nonce: parsed.nonce,
      codeChallenge: parsed.codeChallenge,
      codeChallengeMethod: "S256",
      scopes: parsed.scopes,
      resource: input.runtime.resource,
      currentStep: input.currentStep,
      sessionId: input.sessionId ?? null,
    });
    return created;
  }

  async readFromRequest(
    request: FastifyRequest,
    runtime: ApplicationAuthFactoryRuntime
  ): Promise<ActiveApplicationAuthorizationContext | null> {
    const value = readCookie(request.headers.cookie, cookieName(runtime));
    if (!value) return null;
    const separator = value.lastIndexOf(".");
    if (separator <= 0) return null;
    const opaqueId = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    const expected = await makeSignature(
      contextCookiePayload(runtime.applicationId, opaqueId),
      this.contextSecret(runtime)
    );
    if (!constantTimeEqual(signature, expected)) return null;
    const context = await this.contexts.findActive(
      runtime.applicationId,
      opaqueId
    );
    return context ? { opaqueId, context } : null;
  }

  async rotate(
    runtime: ApplicationAuthFactoryRuntime,
    active: ActiveApplicationAuthorizationContext,
    input: { currentStep: "login" | "consent"; sessionId?: string | null }
  ): Promise<ActiveApplicationAuthorizationContext> {
    const rotated = await this.contexts.rotate(
      runtime.applicationId,
      active.opaqueId,
      input
    );
    if (!rotated) {
      throw new ApplicationAuthRequestError(
        "Authorization context is unavailable or expired"
      );
    }
    return rotated;
  }

  async consume(
    runtime: ApplicationAuthFactoryRuntime,
    active: ActiveApplicationAuthorizationContext
  ): Promise<void> {
    const consumed = await this.contexts.consume(
      runtime.applicationId,
      active.opaqueId
    );
    if (!consumed) {
      throw new ApplicationAuthRequestError(
        "Authorization context is unavailable or expired"
      );
    }
  }

  async createCsrfToken(
    runtime: ApplicationAuthFactoryRuntime,
    opaqueId: string,
    action: ApplicationAuthorizationContextAction
  ): Promise<string> {
    return makeSignature(
      `shopana:iam:application-auth-ui-csrf:v1\0${runtime.applicationId}\0${opaqueId}\0${action}`,
      this.contextSecret(runtime)
    );
  }

  async assertCsrfToken(
    runtime: ApplicationAuthFactoryRuntime,
    active: ActiveApplicationAuthorizationContext,
    action: ApplicationAuthorizationContextAction,
    token: string
  ): Promise<void> {
    const expected = await this.createCsrfToken(
      runtime,
      active.opaqueId,
      action
    );
    if (!constantTimeEqual(token, expected)) {
      throw new ApplicationAuthRequestError("CSRF token is invalid");
    }
  }

  async buildSignedOAuthQuery(
    runtime: ApplicationAuthFactoryRuntime,
    active: ActiveApplicationAuthorizationContext
  ): Promise<string> {
    if (active.context.resource !== runtime.resource) {
      throw new ApplicationAuthRequestError(
        "Authorization context client is unavailable"
      );
    }
    const redirectUri = await this.resolveBoundRedirectUri(runtime, active);
    if (
      hashValue(POST_LOGIN_RETURN_PATH) !==
        active.context.postLoginReturnPathHash
    ) {
      throw new ApplicationAuthRequestError(
        "Authorization context redirect binding is invalid"
      );
    }

    const now = Date.now();
    const expiresAt = Math.min(
      Math.floor(active.context.expiresAt.getTime() / 1_000),
      Math.floor(now / 1_000) + CONTEXT_TTL_SECONDS
    );
    const params = new URLSearchParams();
    params.set("client_id", active.context.clientId);
    params.set("response_type", "code");
    params.set("redirect_uri", redirectUri);
    params.set("scope", active.context.scopes.join(" "));
    params.set("state", active.context.state);
    params.set("nonce", active.context.nonce);
    params.set("code_challenge", active.context.codeChallenge);
    params.set("code_challenge_method", "S256");
    params.set("resource", active.context.resource);
    params.set("exp", String(expiresAt));
    params.set("ba_iat", String(now));
    if (
      active.context.currentStep === "consent" &&
      active.context.sessionId
    ) {
      params.set("ba_pl", active.context.sessionId);
    }
    appendSignedParameterNames(params);
    const signature = await makeSignature(
      canonicalize(params).toString(),
      this.secrets.deriveRealmSecret(
        runtime.applicationId,
        runtime.secretKeyVersion
      )
    );
    params.set("sig", signature);
    return params.toString();
  }

  async resolveBoundRedirectUri(
    runtime: ApplicationAuthFactoryRuntime,
    active: ActiveApplicationAuthorizationContext
  ): Promise<string> {
    const client = await this.clients.findActiveHostedUiClient(
      runtime.applicationId,
      active.context.clientId
    );
    const redirectUri = client?.redirectUris.find(
      (candidate) => hashValue(candidate) === active.context.redirectUriHash
    );
    if (!redirectUri) {
      throw new ApplicationAuthRequestError(
        "Authorization context redirect binding is invalid"
      );
    }
    return redirectUri;
  }

  async assertOAuthRedirectTarget(
    runtime: ApplicationAuthFactoryRuntime,
    active: ActiveApplicationAuthorizationContext,
    target: string
  ): Promise<void> {
    const redirectUri = await this.resolveBoundRedirectUri(runtime, active);
    if (!isBoundOAuthRedirectTarget(target, redirectUri)) {
      throw new ApplicationAuthRequestError(
        "Authorization redirect target is invalid"
      );
    }
  }

  async serializeCookie(
    runtime: ApplicationAuthFactoryRuntime,
    opaqueId: string
  ): Promise<string> {
    const signature = await makeSignature(
      contextCookiePayload(runtime.applicationId, opaqueId),
      this.contextSecret(runtime)
    );
    return serializeCookie(cookieName(runtime), `${opaqueId}.${signature}`, {
      path: `/auth/applications/${runtime.applicationId}`,
      maxAge: CONTEXT_TTL_SECONDS,
      secure: runtime.issuer.startsWith("https://"),
    });
  }

  clearCookie(runtime: ApplicationAuthFactoryRuntime): string {
    return serializeCookie(cookieName(runtime), "", {
      path: `/auth/applications/${runtime.applicationId}`,
      maxAge: 0,
      secure: runtime.issuer.startsWith("https://"),
    });
  }

  private contextSecret(runtime: ApplicationAuthFactoryRuntime): string {
    return this.secrets.derivePurposeSecret(
      runtime.applicationId,
      runtime.secretKeyVersion,
      "authorization-context"
    );
  }

  private async verifySignedOAuthQuery(
    runtime: ApplicationAuthFactoryRuntime,
    rawQuery: string
  ): Promise<{
    clientId: string;
    redirectUri: string;
    state: string;
    nonce: string;
    codeChallenge: string;
    scopes: string[];
    postLoginSessionId: string | undefined;
  }> {
    const params = new URLSearchParams(rawQuery);
    if (
      [...new Set(params.keys())].some(
        (name) => !ALLOWED_SIGNED_QUERY_PARAMETERS.has(name)
      )
    ) {
      throw new ApplicationAuthRequestError(
        "Authorization query contains unsupported parameters"
      );
    }
    const signature = single(params, "sig", 16, 1024);
    const signedNames = params.getAll("ba_param");
    if (
      signedNames.length === 0 ||
      new Set(signedNames).size !== signedNames.length
    ) {
      throw new ApplicationAuthRequestError(
        "Signed authorization query is malformed"
      );
    }
    const signedSet = new Set(signedNames);
    for (const key of new Set(params.keys())) {
      if (key !== "sig" && !signedSet.has(key)) {
        throw new ApplicationAuthRequestError(
          "Authorization query contains unsigned parameters"
        );
      }
    }
    if (!signedSet.has("ba_param")) {
      throw new ApplicationAuthRequestError(
        "Signed authorization query is incomplete"
      );
    }
    const withoutSignature = new URLSearchParams(params);
    withoutSignature.delete("sig");
    const expected = await makeSignature(
      canonicalize(withoutSignature).toString(),
      this.secrets.deriveRealmSecret(
        runtime.applicationId,
        runtime.secretKeyVersion
      )
    );
    if (!constantTimeEqual(signature, expected)) {
      throw new ApplicationAuthRequestError(
        "Signed authorization query is invalid"
      );
    }

    const now = Date.now();
    const expiresAt = Number(single(params, "exp", 1, 16)) * 1_000;
    const issuedAt = Number(single(params, "ba_iat", 1, 20));
    if (
      !Number.isSafeInteger(expiresAt) ||
      !Number.isSafeInteger(issuedAt) ||
      expiresAt < now ||
      expiresAt > now + CONTEXT_TTL_SECONDS * 1_000 ||
      issuedAt > now + 60_000 ||
      issuedAt >= expiresAt
    ) {
      throw new ApplicationAuthRequestError(
        "Signed authorization query is expired or invalid"
      );
    }
    if (single(params, "response_type", 1, 16) !== "code") {
      throw new ApplicationAuthRequestError(
        "Authorization response type is invalid"
      );
    }
    const prompt = params.getAll("prompt");
    if (prompt.length > 1) {
      throw new ApplicationAuthRequestError(
        "Authorization prompt is invalid"
      );
    }
    if (prompt[0]) {
      const values = prompt[0].split(" ").filter(Boolean);
      if (
        values.length === 0 ||
        new Set(values).size !== values.length ||
        values.some(
          (value) =>
            value !== "login" &&
            value !== "create" &&
            value !== "consent"
        )
      ) {
        throw new ApplicationAuthRequestError(
          "Authorization prompt is invalid"
        );
      }
    }
    if (single(params, "code_challenge_method", 1, 16) !== "S256") {
      throw new ApplicationAuthRequestError("PKCE method is invalid");
    }
    const resources = params.getAll("resource");
    if (
      resources.length > 1 ||
      (resources[0] !== undefined && resources[0] !== runtime.resource)
    ) {
      throw new ApplicationAuthRequestError(
        "Authorization resource is invalid"
      );
    }
    const postLoginSessionIds = params.getAll("ba_pl");
    if (
      postLoginSessionIds.length > 1 ||
      (postLoginSessionIds[0] !== undefined &&
        (postLoginSessionIds[0].length < 16 ||
          postLoginSessionIds[0].length > 512))
    ) {
      throw new ApplicationAuthRequestError(
        "Authorization context session is invalid"
      );
    }
    const scope = single(params, "scope", 1, 2048)
      .split(" ")
      .filter(Boolean);
    if (scope.length === 0 || new Set(scope).size !== scope.length) {
      throw new ApplicationAuthRequestError(
        "Authorization scopes are invalid"
      );
    }
    return {
      clientId: single(params, "client_id", 1, 512),
      redirectUri: single(params, "redirect_uri", 1, 2048),
      state: single(params, "state", 16, 2048),
      nonce: single(params, "nonce", 16, 2048),
      codeChallenge: single(params, "code_challenge", 43, 128),
      scopes: scope,
      postLoginSessionId: postLoginSessionIds[0],
    };
  }
}

function appendSignedParameterNames(params: URLSearchParams): void {
  params.delete("ba_param");
  const names = [...new Set([...params.keys(), "ba_param"])].sort();
  for (const name of names) params.append("ba_param", name);
}

function canonicalize(params: URLSearchParams): URLSearchParams {
  const canonical = new URLSearchParams();
  const entries = [...params.entries()].sort(
    ([keyA, valueA], [keyB, valueB]) => {
      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      if (valueA < valueB) return -1;
      if (valueA > valueB) return 1;
      return 0;
    }
  );
  for (const [key, value] of entries) canonical.append(key, value);
  return canonical;
}

function single(
  params: URLSearchParams,
  name: string,
  minLength: number,
  maxLength: number
): string {
  const values = params.getAll(name);
  const value = values[0];
  if (
    values.length !== 1 ||
    value === undefined ||
    value.length < minLength ||
    value.length > maxLength
  ) {
    throw new ApplicationAuthRequestError(
      `Authorization query parameter ${name} is invalid`
    );
  }
  return value;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function cookieName(runtime: ApplicationAuthFactoryRuntime): string {
  return `shopana_application_${runtime.applicationId}.authorization_context`;
}

function contextCookiePayload(applicationId: string, opaqueId: string): string {
  return `shopana:iam:application-authorization-context:v1\0${applicationId}\0${opaqueId}`;
}

function serializeCookie(
  name: string,
  value: string,
  input: { path: string; maxAge: number; secure: boolean }
): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${input.path}`,
    `Max-Age=${input.maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(input.secure ? ["Secure"] : []),
  ].join("; ");
}

function hashValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function isBoundOAuthRedirectTarget(
  targetValue: string,
  registeredValue: string
): boolean {
  if (targetValue.length > 16_384) return false;
  let target: URL;
  let registered: URL;
  try {
    target = new URL(targetValue);
    registered = new URL(registeredValue);
  } catch {
    return false;
  }
  if (
    target.protocol !== registered.protocol ||
    target.username !== registered.username ||
    target.password !== registered.password ||
    target.host !== registered.host ||
    target.pathname !== registered.pathname ||
    target.hash !== registered.hash
  ) {
    return false;
  }
  const targetEntries = [...target.searchParams.entries()];
  return [...registered.searchParams.entries()].every(
    ([registeredName, registeredValue]) =>
      targetEntries.some(
        ([targetName, targetValue]) =>
          targetName === registeredName && targetValue === registeredValue
      )
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.byteLength === rightBuffer.byteLength &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
