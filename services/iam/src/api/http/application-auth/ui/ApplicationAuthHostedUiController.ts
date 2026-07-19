import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createLocalJWKSet, decodeJwt, jwtVerify, type JSONWebKeySet } from "jose";
import { z } from "zod";
import type { ApplicationAuthFactoryRuntime } from "../../../../auth/ApplicationAuthFactory.js";
import type { Kernel } from "../../../../kernel/Kernel.js";
import { normalizeApplicationAuthEmailRecipient } from "../../../../services/ApplicationAuthEmailDeliveryPort.js";
import { ApplicationAuthRateLimitError } from "../../../../services/ApplicationAuthRateLimiter.js";
import {
  ApplicationAuthRequestError,
  parseRawSearchParams,
  sendApplicationAuthFetchResponse,
  type RawApplicationAuthRequest,
} from "../rawRequestBridge.js";
import { APPLICATION_AUTH_UI_STYLES, APPLICATION_AUTH_UI_STYLE_PATH } from "./assets.js";
import {
  ApplicationAuthorizationContextService,
  type ActiveApplicationAuthorizationContext,
} from "./ApplicationAuthorizationContextService.js";
import { createApplicationAuthTranslator } from "./localization.js";
import {
  escapeHtml,
  hiddenInput,
  renderApplicationAuthPage,
  renderMessage,
} from "./render.js";

const UI_FORM_PATHS = new Set([
  "/login/password",
  "/signup/password",
  "/password/forgot",
  "/password/reset",
  "/verification/resend",
  "/consent",
  "/logout",
]);

const UI_GET_PATHS = new Set([
  "/login",
  "/signup",
  "/password/forgot",
  "/password/reset",
  "/verification-pending",
  "/verified",
  "/account-created",
  "/consent",
  "/logout",
  "/error",
]);

interface LogoutState {
  applicationId: string;
  clientId: string;
  userId: string;
  sessionId: string;
  postLogoutRedirectUriHash: string | null;
  state: string | null;
  nonce: string;
  expiresAt: number;
}

export class ApplicationAuthHostedUiController {
  private readonly authorizationContexts: ApplicationAuthorizationContextService;

  constructor(private readonly kernel: Kernel) {
    this.authorizationContexts = new ApplicationAuthorizationContextService(
      kernel.repository.applicationAuthorizationContext,
      kernel.repository.applicationOAuthClient,
      kernel.applicationAuthSecrets
    );
  }

  isRoute(method: string, normalizedPath: string): boolean {
    return (
      (method === "GET" &&
        (UI_GET_PATHS.has(normalizedPath) ||
          normalizedPath === APPLICATION_AUTH_UI_STYLE_PATH ||
          normalizedPath === "/oauth2/end-session")) ||
      (method === "POST" && UI_FORM_PATHS.has(normalizedPath))
    );
  }

  async handle(input: {
    request: FastifyRequest;
    reply: FastifyReply;
    raw: RawApplicationAuthRequest;
    normalizedPath: string;
    runtime: ApplicationAuthFactoryRuntime;
    publicBaseUrl: string;
  }): Promise<boolean> {
    if (!this.isRoute(input.request.method, input.normalizedPath)) return false;
    if (
      input.request.method === "GET" &&
      input.normalizedPath === APPLICATION_AUTH_UI_STYLE_PATH
    ) {
      await input.reply
        .header("cache-control", "public, max-age=31536000, immutable")
        .header("x-content-type-options", "nosniff")
        .type("text/css; charset=utf-8")
        .send(APPLICATION_AUTH_UI_STYLES);
      return true;
    }

    if (input.request.method === "POST") {
      assertSameOriginForm(input.request, input.publicBaseUrl);
    }

    switch (`${input.request.method} ${input.normalizedPath}`) {
      case "GET /login":
        await this.getLogin(input);
        break;
      case "POST /login/password":
        await this.postPasswordSignIn(input);
        break;
      case "GET /signup":
        await this.getSignup(input);
        break;
      case "POST /signup/password":
        await this.postPasswordSignup(input);
        break;
      case "GET /password/forgot":
        await this.getForgotPassword(input);
        break;
      case "POST /password/forgot":
        await this.postForgotPassword(input);
        break;
      case "GET /password/reset":
        await this.getResetPassword(input);
        break;
      case "POST /password/reset":
        await this.postResetPassword(input);
        break;
      case "GET /verification-pending":
        await this.getVerificationPending(input);
        break;
      case "POST /verification/resend":
        await this.postVerificationResend(input);
        break;
      case "GET /verified":
        await this.getVerified(input);
        break;
      case "GET /account-created":
        await this.getAccountCreated(input);
        break;
      case "GET /consent":
        await this.getConsent(input);
        break;
      case "POST /consent":
        await this.postConsent(input);
        break;
      case "GET /oauth2/end-session":
        await this.beginEndSession(input);
        break;
      case "GET /logout":
        await this.getLogout(input);
        break;
      case "POST /logout":
        await this.postLogout(input);
        break;
      case "GET /error":
        await this.sendUnavailable(input.reply, input.runtime, 400);
        break;
      default:
        return false;
    }
    return true;
  }

  async handleError(input: {
    reply: FastifyReply;
    runtime: ApplicationAuthFactoryRuntime;
    error: Error;
  }): Promise<void> {
    const statusCode =
      input.error instanceof ApplicationAuthRateLimitError ||
      input.error instanceof ApplicationAuthRequestError
        ? input.error.statusCode
        : 500;
    input.reply.code(statusCode);
    if (input.error instanceof ApplicationAuthRateLimitError) {
      input.reply.header(
        "retry-after",
        String(input.error.retryAfterSeconds)
      );
    }
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    await sendHtml(
      input.reply,
      input.runtime,
      t("unavailableTitle"),
      `<h1>${escapeHtml(t("unavailableTitle"))}</h1>${renderMessage(
        input.runtime,
        "error",
        "genericAuthError"
      )}`
    );
  }

  private async getLogin(input: HandlerInput): Promise<void> {
    if (input.raw.rawQuery) {
      const previous = await this.authorizationContexts.readFromRequest(
        input.request,
        input.runtime
      );
      const active = await this.authorizationContexts.captureSignedOAuthQuery({
        runtime: input.runtime,
        rawQuery: input.raw.rawQuery,
        currentStep: "login",
        previousOpaqueId: previous?.opaqueId,
      });
      await redirectToUi(input, "/login", [
        await this.authorizationContexts.serializeCookie(
          input.runtime,
          active.opaqueId
        ),
      ]);
      return;
    }
    const active = await this.requireContext(input, "login");
    await this.renderLogin(input, active);
  }

  private async renderLogin(
    input: HandlerInput,
    active: ActiveApplicationAuthorizationContext,
    error = false
  ): Promise<void> {
    const { runtime } = input;
    const t = createApplicationAuthTranslator(runtime.defaultLocale);
    const csrf = await this.authorizationContexts.createCsrfToken(
      runtime,
      active.opaqueId,
      "password-signin"
    );
    const signInForm = runtime.policy.passwordSignInAllowed
      ? `<form method="post" action="./login/password">
          ${hiddenInput("csrf", csrf)}
          <div class="field"><label for="email">${escapeHtml(t("email"))}</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="320"></div>
          <div class="field"><label for="password">${escapeHtml(t("password"))}</label><input id="password" name="password" type="password" autocomplete="current-password" required minlength="10" maxlength="128"></div>
          <button type="submit">${escapeHtml(t("signIn"))}</button>
        </form>`
      : "";
    const links = [
      runtime.policy.passwordSignUpAllowed
        ? `<a href="./signup">${escapeHtml(t("signUp"))}</a>`
        : "",
      runtime.policy.passwordResetAllowed
        ? `<a href="./password/forgot">${escapeHtml(t("forgotPassword"))}</a>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    const body = `<h1>${escapeHtml(t("signInTitle"))}</h1><p class="muted">${escapeHtml(t("signInHint"))}</p>${
      error ? renderMessage(runtime, "error", "genericAuthError") : ""
    }${signInForm}${links ? `<nav class="links">${links}</nav>` : ""}`;
    await sendHtml(input.reply, runtime, t("signInTitle"), body);
  }

  private async postPasswordSignIn(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.passwordSignInAllowed) throw uiNotFound();
    const form = parseForm(input.raw);
    const email = parseEmail(singleFormValue(form, "email", 3, 320));
    const password = singleFormValue(form, "password", 10, 128);
    const active = await this.requireContext(input, "login");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      "password-signin",
      singleFormValue(form, "csrf", 16, 1024)
    );
    await this.kernel.applicationAuthRateLimiter.assertPasswordSignIn({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email,
      ip: input.request.ip,
      secret: this.rateLimitSecret(input.runtime),
    });
    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "login" }
    );
    const oauthQuery = await this.authorizationContexts.buildSignedOAuthQuery(
      input.runtime,
      rotated
    );
    const response = await this.callBetterAuth(input, "/sign-in/email", {
      email,
      password,
      rememberMe: true,
      oauth_query: oauthQuery,
    });
    const contextCookie = await this.authorizationContexts.serializeCookie(
      input.runtime,
      rotated.opaqueId
    );
    if (response.ok && response.headers.has("location")) {
      await this.authorizationContexts.consume(input.runtime, rotated);
      await sendApplicationAuthFetchResponse(
        appendSetCookie(
          response,
          this.authorizationContexts.clearCookie(input.runtime)
        ),
        input.reply
      );
      return;
    }
    input.reply.header("set-cookie", contextCookie);
    await this.renderLogin(input, rotated, true);
  }

  private async getSignup(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.passwordSignUpAllowed) throw uiNotFound();
    const active = await this.requireContext(input, "login");
    await this.renderSignup(input, active);
  }

  private async renderSignup(
    input: HandlerInput,
    active: ActiveApplicationAuthorizationContext,
    error = false
  ): Promise<void> {
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const csrf = await this.authorizationContexts.createCsrfToken(
      input.runtime,
      active.opaqueId,
      "password-signup"
    );
    const body = `<h1>${escapeHtml(t("signUpTitle"))}</h1><p class="muted">${escapeHtml(t("signUpHint"))}</p>${
      error ? renderMessage(input.runtime, "error", "genericAuthError") : ""
    }<form method="post" action="./signup/password">
      ${hiddenInput("csrf", csrf)}
      <div class="field"><label for="name">${escapeHtml(t("name"))}</label><input id="name" name="name" autocomplete="name" required maxlength="80"></div>
      <div class="field"><label for="email">${escapeHtml(t("email"))}</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="320"></div>
      <div class="field"><label for="password">${escapeHtml(t("password"))}</label><input id="password" name="password" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></div>
      <button type="submit">${escapeHtml(t("signUp"))}</button>
    </form><nav class="links"><a href="./login">${escapeHtml(t("backToSignIn"))}</a></nav>`;
    await sendHtml(input.reply, input.runtime, t("signUpTitle"), body);
  }

  private async postPasswordSignup(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.passwordSignUpAllowed) throw uiNotFound();
    const form = parseForm(input.raw);
    const name = singleFormValue(form, "name", 1, 80).trim();
    const email = parseEmail(singleFormValue(form, "email", 3, 320));
    const password = singleFormValue(form, "password", 10, 128);
    const active = await this.requireContext(input, "login");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      "password-signup",
      singleFormValue(form, "csrf", 16, 1024)
    );
    await this.kernel.applicationAuthRateLimiter.assertPasswordSignIn({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email,
      ip: input.request.ip,
      secret: this.rateLimitSecret(input.runtime),
    });
    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "login" }
    );
    const response = await this.callBetterAuth(input, "/sign-up/email", {
      name,
      email,
      password,
      rememberMe: true,
      callbackURL: `${input.runtime.issuer}/verified`,
      oauth_query:
        await this.authorizationContexts.buildSignedOAuthQuery(
          input.runtime,
          rotated
        ),
    });
    const contextCookie = await this.authorizationContexts.serializeCookie(
      input.runtime,
      rotated.opaqueId
    );
    if (response.ok && response.headers.has("location")) {
      await this.authorizationContexts.consume(input.runtime, rotated);
      await sendApplicationAuthFetchResponse(
        appendSetCookie(
          response,
          this.authorizationContexts.clearCookie(input.runtime)
        ),
        input.reply
      );
      return;
    }
    if (response.ok) {
      await redirectToUi(
        input,
        input.runtime.emailVerificationRequired
          ? "/verification-pending"
          : "/account-created",
        [contextCookie]
      );
      return;
    }
    input.reply.header("set-cookie", contextCookie);
    await this.renderSignup(input, rotated, true);
  }

  private async getForgotPassword(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.passwordResetAllowed) throw uiNotFound();
    const active = await this.requireContext(input, "login");
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const csrf = await this.authorizationContexts.createCsrfToken(
      input.runtime,
      active.opaqueId,
      "password-reset-request"
    );
    const body = `<h1>${escapeHtml(t("resetPasswordTitle"))}</h1><p class="muted">${escapeHtml(t("resetPasswordRequestHint"))}</p><form method="post" action="./forgot">
      ${hiddenInput("csrf", csrf)}
      <div class="field"><label for="email">${escapeHtml(t("email"))}</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="320"></div>
      <button type="submit">${escapeHtml(t("sendResetLink"))}</button>
    </form><nav class="links"><a href="../login">${escapeHtml(t("backToSignIn"))}</a></nav>`;
    await sendHtml(input.reply, input.runtime, t("resetPasswordTitle"), body);
  }

  private async postForgotPassword(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.passwordResetAllowed) throw uiNotFound();
    const form = parseForm(input.raw);
    const email = parseEmail(singleFormValue(form, "email", 3, 320));
    const active = await this.requireContext(input, "login");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      "password-reset-request",
      singleFormValue(form, "csrf", 16, 1024)
    );
    await this.kernel.applicationAuthRateLimiter.assertPasswordReset({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email,
      ip: input.request.ip,
      secret: this.rateLimitSecret(input.runtime),
    });
    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "login" }
    );
    await this.callBetterAuth(input, "/request-password-reset", {
      email,
      redirectTo: `${input.runtime.issuer}/password/reset`,
    });
    input.reply.header(
      "set-cookie",
      await this.authorizationContexts.serializeCookie(
        input.runtime,
        rotated.opaqueId
      )
    );
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const body = `<h1>${escapeHtml(t("resetPasswordTitle"))}</h1>${renderMessage(
      input.runtime,
      "success",
      "resetRequestAccepted"
    )}<nav class="links"><a href="../login">${escapeHtml(t("backToSignIn"))}</a></nav>`;
    await sendHtml(input.reply, input.runtime, t("resetPasswordTitle"), body);
  }

  private async getResetPassword(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.passwordResetAllowed) throw uiNotFound();
    const query = parseRawSearchParams(input.raw.rawQuery);
    const token = singleQueryValue(query, "token", 16, 2048);
    const csrf = await this.createResetCsrf(input.runtime, token);
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const body = `<h1>${escapeHtml(t("resetPasswordTitle"))}</h1><form method="post" action="./reset">
      ${hiddenInput("token", token)}${hiddenInput("csrf", csrf)}
      <div class="field"><label for="new-password">${escapeHtml(t("newPassword"))}</label><input id="new-password" name="newPassword" type="password" autocomplete="new-password" required minlength="10" maxlength="128"></div>
      <button type="submit">${escapeHtml(t("resetPassword"))}</button>
    </form>`;
    await sendHtml(input.reply, input.runtime, t("resetPasswordTitle"), body);
  }

  private async postResetPassword(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.passwordResetAllowed) throw uiNotFound();
    const form = parseForm(input.raw);
    const token = singleFormValue(form, "token", 16, 2048);
    const csrf = singleFormValue(form, "csrf", 16, 1024);
    const expected = await this.createResetCsrf(input.runtime, token);
    if (!constantTimeEqual(csrf, expected)) {
      throw new ApplicationAuthRequestError("CSRF token is invalid");
    }
    const response = await this.callBetterAuth(input, "/reset-password", {
      token,
      newPassword: singleFormValue(form, "newPassword", 10, 128),
    });
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const body = response.ok
      ? `<h1>${escapeHtml(t("resetPasswordTitle"))}</h1>${renderMessage(
          input.runtime,
          "success",
          "resetComplete"
        )}<nav class="links"><a href="../login">${escapeHtml(t("backToSignIn"))}</a></nav>`
      : `<h1>${escapeHtml(t("resetPasswordTitle"))}</h1>${renderMessage(
          input.runtime,
          "error",
          "genericAuthError"
        )}`;
    await sendHtml(input.reply, input.runtime, t("resetPasswordTitle"), body);
  }

  private async getVerificationPending(input: HandlerInput): Promise<void> {
    const active = await this.requireContext(input, "login");
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const csrf = await this.authorizationContexts.createCsrfToken(
      input.runtime,
      active.opaqueId,
      "verification-resend"
    );
    const resend = input.runtime.emailVerificationRequired
      ? `<form method="post" action="./verification/resend">${hiddenInput(
          "csrf",
          csrf
        )}<div class="field"><label for="email">${escapeHtml(
          t("email")
        )}</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="320"></div><button type="submit">${escapeHtml(
          t("resendVerification")
        )}</button></form>`
      : "";
    const body = `<h1>${escapeHtml(t("verificationPendingTitle"))}</h1><p class="muted">${escapeHtml(t("verificationPendingHint"))}</p>${resend}<nav class="links"><a href="./login">${escapeHtml(t("backToSignIn"))}</a></nav>`;
    input.reply.header(
      "set-cookie",
      await this.authorizationContexts.serializeCookie(
        input.runtime,
        active.opaqueId
      )
    );
    await sendHtml(
      input.reply,
      input.runtime,
      t("verificationPendingTitle"),
      body
    );
  }

  private async postVerificationResend(input: HandlerInput): Promise<void> {
    if (!input.runtime.emailVerificationRequired) throw uiNotFound();
    const form = parseForm(input.raw);
    const email = parseEmail(singleFormValue(form, "email", 3, 320));
    const active = await this.requireContext(input, "login");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      "verification-resend",
      singleFormValue(form, "csrf", 16, 1024)
    );
    await this.kernel.applicationAuthRateLimiter.assertPasswordReset({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email,
      ip: input.request.ip,
      secret: this.rateLimitSecret(input.runtime),
    });
    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "login" }
    );
    await this.callBetterAuth(input, "/send-verification-email", {
      email,
      callbackURL: `${input.runtime.issuer}/verified`,
    });
    input.reply.header(
      "set-cookie",
      await this.authorizationContexts.serializeCookie(
        input.runtime,
        rotated.opaqueId
      )
    );
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    await sendHtml(
      input.reply,
      input.runtime,
      t("verificationPendingTitle"),
      `<h1>${escapeHtml(t("verificationPendingTitle"))}</h1>${renderMessage(
        input.runtime,
        "success",
        "verificationResent"
      )}`
    );
  }

  private async getVerified(input: HandlerInput): Promise<void> {
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const body = `<h1>${escapeHtml(t("verifiedTitle"))}</h1><p class="muted">${escapeHtml(t("verifiedHint"))}</p><nav class="links"><a href="./login">${escapeHtml(t("backToSignIn"))}</a></nav>`;
    await sendHtml(input.reply, input.runtime, t("verifiedTitle"), body);
  }

  private async getAccountCreated(input: HandlerInput): Promise<void> {
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const body = `<h1>${escapeHtml(t("accountCreatedTitle"))}</h1><p class="muted">${escapeHtml(t("accountCreatedHint"))}</p>`;
    await sendHtml(
      input.reply,
      input.runtime,
      t("accountCreatedTitle"),
      body
    );
  }

  private async getConsent(input: HandlerInput): Promise<void> {
    if (input.raw.rawQuery) {
      const previous = await this.authorizationContexts.readFromRequest(
        input.request,
        input.runtime
      );
      const sessionId = await this.readCurrentSessionId(input);
      const active = await this.authorizationContexts.captureSignedOAuthQuery({
        runtime: input.runtime,
        rawQuery: input.raw.rawQuery,
        currentStep: "consent",
        sessionId,
        previousOpaqueId: previous?.opaqueId,
      });
      await redirectToUi(input, "/consent", [
        await this.authorizationContexts.serializeCookie(
          input.runtime,
          active.opaqueId
        ),
      ]);
      return;
    }
    const active = await this.requireContext(input, "consent");
    const client = await this.kernel.repository.applicationOAuthClient.findActiveHostedUiClient(
      input.runtime.applicationId,
      active.context.clientId
    );
    if (!client) throw uiNotFound();
    const csrf = await this.authorizationContexts.createCsrfToken(
      input.runtime,
      active.opaqueId,
      "consent"
    );
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const clientName = client.name ?? "Application";
    const scopes = active.context.scopes
      .map((scope) => `<li><code>${escapeHtml(scope)}</code></li>`)
      .join("");
    const body = `<h1>${escapeHtml(t("consentTitle"))}</h1><p class="muted"><strong>${escapeHtml(clientName)}</strong> — ${escapeHtml(t("consentHint"))}</p><ul class="scope-list">${scopes}</ul><form method="post" action="./consent">
      ${hiddenInput("csrf", csrf)}
      <div class="actions"><button name="decision" value="allow" type="submit">${escapeHtml(t("allow"))}</button><button class="button-secondary" name="decision" value="deny" type="submit">${escapeHtml(t("deny"))}</button></div>
    </form>`;
    await sendHtml(input.reply, input.runtime, t("consentTitle"), body);
  }

  private async postConsent(input: HandlerInput): Promise<void> {
    const form = parseForm(input.raw);
    const active = await this.requireContext(input, "consent");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      "consent",
      singleFormValue(form, "csrf", 16, 1024)
    );
    const decision = singleFormValue(form, "decision", 4, 5);
    if (decision !== "allow" && decision !== "deny") {
      throw new ApplicationAuthRequestError("Consent decision is invalid");
    }
    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "consent", sessionId: active.context.sessionId }
    );
    const response = await this.callBetterAuth(input, "/oauth2/consent", {
      accept: decision === "allow",
      scope: active.context.scopes.join(" "),
      oauth_query:
        await this.authorizationContexts.buildSignedOAuthQuery(
          input.runtime,
          rotated
        ),
    });
    if (response.ok || response.status === 302 || response.status === 303) {
      await this.authorizationContexts.consume(input.runtime, rotated);
      await sendApplicationAuthFetchResponse(
        appendSetCookie(
          response,
          this.authorizationContexts.clearCookie(input.runtime)
        ),
        input.reply
      );
      return;
    }
    input.reply.header(
      "set-cookie",
      await this.authorizationContexts.serializeCookie(
        input.runtime,
        rotated.opaqueId
      )
    );
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    await sendHtml(
      input.reply,
      input.runtime,
      t("consentTitle"),
      `<h1>${escapeHtml(t("consentTitle"))}</h1>${renderMessage(
        input.runtime,
        "error",
        "genericAuthError"
      )}`
    );
  }

  private async beginEndSession(input: HandlerInput): Promise<void> {
    const query = parseRawSearchParams(input.raw.rawQuery);
    const idTokenHint = singleQueryValue(query, "id_token_hint", 16, 16_384);
    let decoded: ReturnType<typeof decodeJwt>;
    try {
      decoded = decodeJwt(idTokenHint);
    } catch {
      throw new ApplicationAuthRequestError("End-session token is invalid");
    }
    const decodedAudience = Array.isArray(decoded.aud)
      ? decoded.aud[0]
      : decoded.aud;
    const requestedClientId = optionalSingleQueryValue(
      query,
      "client_id",
      1,
      512
    );
    const clientId = requestedClientId ?? decodedAudience;
    if (!clientId || (requestedClientId && !audienceIncludes(decoded.aud, clientId))) {
      throw new ApplicationAuthRequestError("End-session client is invalid");
    }
    const client = await this.kernel.repository.applicationOAuthClient.findActiveHostedUiClient(
      input.runtime.applicationId,
      clientId
    );
    if (!client?.enableEndSession) throw uiNotFound();
    const postLogoutRedirectUri = optionalSingleQueryValue(
      query,
      "post_logout_redirect_uri",
      1,
      2048
    );
    if (
      postLogoutRedirectUri &&
      !client.postLogoutRedirectUris.includes(postLogoutRedirectUri)
    ) {
      throw new ApplicationAuthRequestError(
        "Post-logout redirect URI is invalid"
      );
    }
    const jwksResponse = await input.runtime.auth.handler(
      new Request(`${input.runtime.issuer}/jwks`, { method: "GET" })
    );
    if (!jwksResponse.ok) {
      throw new ApplicationAuthRequestError("End-session token is invalid");
    }
    const jwks = (await jwksResponse.json()) as JSONWebKeySet;
    let payload;
    try {
      ({ payload } = await jwtVerify(idTokenHint, createLocalJWKSet(jwks), {
        issuer: input.runtime.issuer,
        audience: clientId,
      }));
    } catch {
      throw new ApplicationAuthRequestError("End-session token is invalid");
    }
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      throw new ApplicationAuthRequestError("End-session token is invalid");
    }
    const session = await this.kernel.repository.authSession
      .forApplication(input.runtime.applicationId)
      .validate(payload.sub, payload.sid);
    if (!session) {
      throw new ApplicationAuthRequestError("End-session is unavailable");
    }
    const state: LogoutState = {
      applicationId: input.runtime.applicationId,
      clientId,
      userId: payload.sub,
      sessionId: payload.sid,
      postLogoutRedirectUriHash: postLogoutRedirectUri
        ? hashValue(postLogoutRedirectUri)
        : null,
      state: optionalSingleQueryValue(query, "state", 1, 2048),
      nonce: randomBytes(32).toString("base64url"),
      expiresAt: Date.now() + 10 * 60 * 1_000,
    };
    await redirectToUi(input, "/logout", [
      await this.serializeLogoutCookie(input.runtime, state),
    ]);
  }

  private async getLogout(input: HandlerInput): Promise<void> {
    const state = await this.readLogoutState(input);
    if (!state) {
      await this.sendUnavailable(input.reply, input.runtime, 400);
      return;
    }
    const csrf = await this.createLogoutCsrf(input.runtime, state);
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const body = `<h1>${escapeHtml(t("logoutTitle"))}</h1><p class="muted">${escapeHtml(t("logoutHint"))}</p><form method="post" action="./logout">${hiddenInput(
      "csrf",
      csrf
    )}<div class="actions"><button type="submit">${escapeHtml(
      t("logout")
    )}</button></div></form>`;
    await sendHtml(input.reply, input.runtime, t("logoutTitle"), body);
  }

  private async postLogout(input: HandlerInput): Promise<void> {
    const state = await this.readLogoutState(input);
    if (!state) throw new ApplicationAuthRequestError("Logout state is invalid");
    const form = parseForm(input.raw);
    const csrf = singleFormValue(form, "csrf", 16, 1024);
    const expected = await this.createLogoutCsrf(input.runtime, state);
    if (!constantTimeEqual(csrf, expected)) {
      throw new ApplicationAuthRequestError("CSRF token is invalid");
    }
    const client = await this.kernel.repository.applicationOAuthClient.findActiveHostedUiClient(
      input.runtime.applicationId,
      state.clientId
    );
    if (!client?.enableEndSession) throw uiNotFound();
    const sessionRepository = this.kernel.repository.authSession.forApplication(
      input.runtime.applicationId
    );
    const session = await sessionRepository.validate(
      state.userId,
      state.sessionId
    );
    if (!session) {
      throw new ApplicationAuthRequestError("Logout state is already consumed");
    }
    await sessionRepository.revokeSession(state.userId, state.sessionId);

    const cookies = this.clearLogoutCookies(input.runtime);
    const redirectUri = state.postLogoutRedirectUriHash
      ? client.postLogoutRedirectUris.find(
          (candidate) => hashValue(candidate) === state.postLogoutRedirectUriHash
        )
      : undefined;
    if (state.postLogoutRedirectUriHash && !redirectUri) {
      throw new ApplicationAuthRequestError(
        "Post-logout redirect binding is invalid"
      );
    }
    if (redirectUri) {
      const target = new URL(redirectUri);
      if (state.state) target.searchParams.set("state", state.state);
      input.reply
        .code(303)
        .headers(noStoreHeaders())
        .header("x-content-type-options", "nosniff")
        .header("referrer-policy", "no-referrer")
        .header("set-cookie", cookies)
        .header("location", target.toString());
      await input.reply.send();
      return;
    }
    input.reply.header("set-cookie", cookies);
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    await sendHtml(
      input.reply,
      input.runtime,
      t("logout"),
      `<h1>${escapeHtml(t("logout"))}</h1>`
    );
  }

  private async requireContext(
    input: HandlerInput,
    expectedStep: "login" | "consent"
  ): Promise<ActiveApplicationAuthorizationContext> {
    const active = await this.authorizationContexts.readFromRequest(
      input.request,
      input.runtime
    );
    if (!active || active.context.currentStep !== expectedStep) {
      throw new ApplicationAuthRequestError(
        "Authorization context is unavailable or expired"
      );
    }
    return active;
  }

  private async callBetterAuth(
    input: HandlerInput,
    path: string,
    body: Record<string, unknown>
  ): Promise<Response> {
    const headers = new Headers({
      accept: "text/html,application/xhtml+xml",
      "content-type": "application/json; charset=utf-8",
      host: new URL(input.publicBaseUrl).host,
      origin: input.publicBaseUrl,
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": input.request.ip,
      "x-request-id": String(input.request.id),
    });
    if (input.request.headers.cookie) {
      headers.set("cookie", input.request.headers.cookie);
    }
    if (input.request.headers["user-agent"]) {
      headers.set("user-agent", input.request.headers["user-agent"]);
    }
    return input.runtime.auth.handler(
      new Request(`${input.runtime.issuer}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        redirect: "manual",
      })
    );
  }

  private async readCurrentSessionId(input: HandlerInput): Promise<string> {
    const headers = new Headers({
      accept: "application/json",
      host: new URL(input.publicBaseUrl).host,
      "x-forwarded-for": input.request.ip,
    });
    if (input.request.headers.cookie) {
      headers.set("cookie", input.request.headers.cookie);
    }
    const response = await input.runtime.auth.handler(
      new Request(`${input.runtime.issuer}/get-session`, {
        method: "GET",
        headers,
      })
    );
    if (!response.ok) {
      throw new ApplicationAuthRequestError("Application session is unavailable");
    }
    const value = (await response.json()) as { session?: { id?: unknown } };
    if (typeof value.session?.id !== "string") {
      throw new ApplicationAuthRequestError("Application session is unavailable");
    }
    return value.session.id;
  }

  private rateLimitSecret(runtime: ApplicationAuthFactoryRuntime): string {
    return this.kernel.applicationAuthSecrets.derivePurposeSecret(
      runtime.applicationId,
      runtime.secretKeyVersion,
      "rate-limit"
    );
  }

  private createResetCsrf(
    runtime: ApplicationAuthFactoryRuntime,
    token: string
  ): Promise<string> {
    return makeSignature(
      `shopana:iam:application-auth-reset-csrf:v1\0${runtime.applicationId}\0${hashValue(
        token
      )}`,
      this.kernel.applicationAuthSecrets.derivePurposeSecret(
        runtime.applicationId,
        runtime.secretKeyVersion,
        "authorization-context"
      )
    );
  }

  private async serializeLogoutCookie(
    runtime: ApplicationAuthFactoryRuntime,
    state: LogoutState
  ): Promise<string> {
    const payload = Buffer.from(JSON.stringify(state), "utf8").toString(
      "base64url"
    );
    const signature = await makeSignature(
      payload,
      this.logoutSecret(runtime)
    );
    return serializeCookie(logoutCookieName(runtime), `${payload}.${signature}`, {
      path: `/auth/applications/${runtime.applicationId}`,
      maxAge: 10 * 60,
      secure: runtime.issuer.startsWith("https://"),
    });
  }

  private async readLogoutState(input: HandlerInput): Promise<LogoutState | null> {
    const raw = readCookie(
      input.request.headers.cookie,
      logoutCookieName(input.runtime)
    );
    if (!raw) return null;
    const separator = raw.lastIndexOf(".");
    if (separator <= 0) return null;
    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    const expected = await makeSignature(payload, this.logoutSecret(input.runtime));
    if (!constantTimeEqual(signature, expected)) return null;
    let value: unknown;
    try {
      value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return null;
    }
    const parsed = logoutStateSchema.safeParse(value);
    if (
      !parsed.success ||
      parsed.data.applicationId !== input.runtime.applicationId ||
      parsed.data.expiresAt <= Date.now()
    ) {
      return null;
    }
    return parsed.data;
  }

  private createLogoutCsrf(
    runtime: ApplicationAuthFactoryRuntime,
    state: LogoutState
  ): Promise<string> {
    return makeSignature(
      `shopana:iam:application-auth-logout-csrf:v1\0${runtime.applicationId}\0${state.nonce}\0${state.sessionId}`,
      this.logoutSecret(runtime)
    );
  }

  private logoutSecret(runtime: ApplicationAuthFactoryRuntime): string {
    return this.kernel.applicationAuthSecrets.derivePurposeSecret(
      runtime.applicationId,
      runtime.secretKeyVersion,
      "hosted-ui-logout"
    );
  }

  private clearLogoutCookies(runtime: ApplicationAuthFactoryRuntime): string[] {
    const path = `/auth/applications/${runtime.applicationId}`;
    const secure = runtime.issuer.startsWith("https://");
    const prefix = `${secure ? "__Secure-" : ""}shopana_application_${
      runtime.applicationId
    }`;
    return [
      logoutCookieName(runtime),
      `${prefix}.session_token`,
      `${prefix}.session_data`,
      `${prefix}.account_data`,
      `${prefix}.dont_remember`,
    ].map((name) =>
      serializeCookie(name, "", { path, maxAge: 0, secure })
    );
  }

  private async sendUnavailable(
    reply: FastifyReply,
    runtime: ApplicationAuthFactoryRuntime,
    statusCode: number
  ): Promise<void> {
    const t = createApplicationAuthTranslator(runtime.defaultLocale);
    reply.code(statusCode);
    await sendHtml(
      reply,
      runtime,
      t("unavailableTitle"),
      `<h1>${escapeHtml(t("unavailableTitle"))}</h1><p class="muted">${escapeHtml(
        t("unavailableHint")
      )}</p>`
    );
  }
}

type HandlerInput = Parameters<ApplicationAuthHostedUiController["handle"]>[0];

const logoutStateSchema = z
  .object({
    applicationId: z.string().uuid(),
    clientId: z.string().min(1).max(512),
    userId: z.string().min(1).max(512),
    sessionId: z.string().min(1).max(512),
    postLogoutRedirectUriHash: z.string().min(32).max(128).nullable(),
    state: z.string().min(1).max(2048).nullable(),
    nonce: z.string().min(32).max(128),
    expiresAt: z.number().int().positive(),
  })
  .strict();

function parseForm(raw: RawApplicationAuthRequest): URLSearchParams {
  if (raw.contentType?.split(";", 1)[0]?.trim().toLowerCase() !== "application/x-www-form-urlencoded") {
    throw new ApplicationAuthRequestError(
      "Hosted authentication forms require application/x-www-form-urlencoded"
    );
  }
  if (!raw.body || raw.body.length === 0) {
    throw new ApplicationAuthRequestError("Hosted authentication form is empty");
  }
  return parseRawSearchParams(raw.body.toString("utf8"));
}

function singleFormValue(
  form: URLSearchParams,
  name: string,
  minLength: number,
  maxLength: number
): string {
  return singleQueryValue(form, name, minLength, maxLength);
}

function singleQueryValue(
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
    throw new ApplicationAuthRequestError(`${name} is invalid`);
  }
  return value;
}

function optionalSingleQueryValue(
  params: URLSearchParams,
  name: string,
  minLength: number,
  maxLength: number
): string | null {
  const values = params.getAll(name);
  if (values.length === 0) return null;
  return singleQueryValue(params, name, minLength, maxLength);
}

function parseEmail(value: string): string {
  const result = z.string().email().max(320).safeParse(value);
  if (!result.success) throw new ApplicationAuthRequestError("Email is invalid");
  return normalizeApplicationAuthEmailRecipient(result.data);
}

function assertSameOriginForm(request: FastifyRequest, publicBaseUrl: string): void {
  if (
    request.headers.origin !== publicBaseUrl ||
    (request.headers["sec-fetch-site"] !== undefined &&
      request.headers["sec-fetch-site"] !== "same-origin")
  ) {
    throw new ApplicationAuthRequestError("Hosted authentication form origin is invalid");
  }
}

async function sendHtml(
  reply: FastifyReply,
  runtime: ApplicationAuthFactoryRuntime,
  title: string,
  body: string
): Promise<void> {
  reply.headers({
    ...noStoreHeaders(),
    "content-security-policy":
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https: data:; style-src 'self'",
    "content-language": runtime.defaultLocale,
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  await reply
    .type("text/html; charset=utf-8")
    .send(renderApplicationAuthPage({ runtime, title, body }));
}

async function redirectToUi(
  input: HandlerInput,
  relativePath: string,
  cookies: readonly string[]
): Promise<void> {
  input.reply
    .code(303)
    .headers(noStoreHeaders())
    .header("x-content-type-options", "nosniff")
    .header("referrer-policy", "no-referrer")
    .header("location", `${input.runtime.issuer}${relativePath}`)
    .header("set-cookie", [...cookies]);
  await input.reply.send();
}

function appendSetCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.append("set-cookie", cookie);
  headers.set("cache-control", "no-store");
  headers.set("pragma", "no-cache");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function noStoreHeaders(): Record<string, string> {
  return { "cache-control": "no-store", pragma: "no-cache" };
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

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function logoutCookieName(runtime: ApplicationAuthFactoryRuntime): string {
  return `shopana_application_${runtime.applicationId}.logout_context`;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function audienceIncludes(
  audience: string | string[] | undefined,
  clientId: string
): boolean {
  return Array.isArray(audience)
    ? audience.includes(clientId)
    : audience === clientId;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.byteLength === rightBuffer.byteLength &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function uiNotFound(): ApplicationAuthRequestError {
  return new ApplicationAuthRequestError(
    "Hosted authentication endpoint was not found",
    404,
    "not_found"
  );
}

export function isApplicationAuthHostedUiPath(path: string): boolean {
  return (
    UI_GET_PATHS.has(path) ||
    UI_FORM_PATHS.has(path) ||
    path === APPLICATION_AUTH_UI_STYLE_PATH
  );
}
