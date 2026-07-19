import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createLocalJWKSet, decodeJwt, jwtVerify, type JSONWebKeySet } from "jose";
import { z } from "zod";
import type { ApplicationAuthFactoryRuntime } from "../../../../auth/ApplicationAuthFactory.js";
import type { Kernel } from "../../../../kernel/Kernel.js";
import type { ApplicationAuthAuditReasonCategory } from "../../../../services/ApplicationAuthAuditService.js";
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

const EMAIL_OTP_GENERIC_RESPONSE_FLOOR_MS = 250;

const UI_FORM_PATHS = new Set([
  "/login/password",
  "/signup/password",
  "/email-otp/request",
  "/email-otp/verify",
  "/password/forgot",
  "/password/reset",
  "/verification/resend",
  "/consent",
  "/logout",
  "/login/social",
  "/account/connections/link",
  "/account/connections/unlink",
]);

const UI_GET_PATHS = new Set([
  "/login",
  "/signup",
  "/email-otp",
  "/email-otp/verify",
  "/password/forgot",
  "/password/reset",
  "/verification-pending",
  "/verified",
  "/account-created",
  "/consent",
  "/logout",
  "/error",
  "/account/connections",
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
      case "POST /login/social":
        await this.postSocialSignIn(input);
        break;
      case "GET /signup":
        await this.getSignup(input);
        break;
      case "POST /signup/password":
        await this.postPasswordSignup(input);
        break;
      case "GET /email-otp":
        await this.getEmailOtpRequest(input);
        break;
      case "POST /email-otp/request":
        await this.postEmailOtpRequest(input);
        break;
      case "GET /email-otp/verify":
        await this.getEmailOtpVerify(input);
        break;
      case "POST /email-otp/verify":
        await this.postEmailOtpVerify(input);
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
      case "GET /account/connections":
        await this.getAccountConnections(input);
        break;
      case "POST /account/connections/link":
        await this.postAccountConnectionLink(input);
        break;
      case "POST /account/connections/unlink":
        await this.postAccountConnectionUnlink(input);
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
    const socialForms = runtime.routeManifest.allowedSocialProviders
      .map((provider) => {
        const socialCsrf = this.authorizationContexts.createCsrfToken(
          runtime,
          active.opaqueId,
          `social-signin:${provider}`
        );
        return { provider, socialCsrf };
      });
    const socialButtons = (
      await Promise.all(
        socialForms.map(async ({ provider, socialCsrf }) =>
          `<form method="post" action="./login/social">
            ${hiddenInput("csrf", await socialCsrf)}
            ${hiddenInput("provider", provider)}
            <button class="button-secondary" type="submit">${escapeHtml(
              provider === "google"
                ? t("continueWithGoogle")
                : t("continueWithFacebook")
            )}</button>
          </form>`
        )
      )
    ).join("");
    const links = [
      runtime.policy.passwordSignUpAllowed
        ? `<a href="./signup">${escapeHtml(t("signUp"))}</a>`
        : "",
      runtime.policy.passwordResetAllowed
        ? `<a href="./password/forgot">${escapeHtml(t("forgotPassword"))}</a>`
        : "",
      runtime.policy.emailOtpSignInAllowed
        ? `<a href="./email-otp">${escapeHtml(t("emailOtpTitle"))}</a>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    const body = `<h1>${escapeHtml(t("signInTitle"))}</h1><p class="muted">${escapeHtml(t("signInHint"))}</p>${
      error ? renderMessage(runtime, "error", "genericAuthError") : ""
    }${socialButtons ? `<div class="social-actions">${socialButtons}</div>${signInForm ? '<div class="divider"></div>' : ""}` : ""}${signInForm}${links ? `<nav class="links">${links}</nav>` : ""}`;
    await sendHtml(input.reply, runtime, t("signInTitle"), body);
  }

  private async postSocialSignIn(input: HandlerInput): Promise<void> {
    const form = parseForm(input.raw);
    const provider = parseSocialProvider(
      singleFormValue(form, "provider", 6, 8)
    );
    if (!input.runtime.routeManifest.allowedSocialProviders.includes(provider)) {
      throw uiNotFound();
    }
    const active = await this.requireContext(input, "login");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      `social-signin:${provider}`,
      singleFormValue(form, "csrf", 16, 1024)
    );
    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "login" }
    );
    const response = await this.callBetterAuth(input, "/sign-in/social", {
      provider,
      oauth_query: await this.authorizationContexts.buildSignedOAuthQuery(
        input.runtime,
        rotated
      ),
    });
    if (!response.ok || !response.headers.has("location")) {
      input.reply.header(
        "set-cookie",
        await this.authorizationContexts.serializeCookie(
          input.runtime,
          rotated.opaqueId
        )
      );
      await this.renderLogin(input, rotated, true);
      return;
    }
    await this.authorizationContexts.consume(input.runtime, rotated);
    await sendApplicationAuthFetchResponse(
      asBrowserRedirect(
        appendSetCookie(
          response,
          this.authorizationContexts.clearCookie(input.runtime)
        )
      ),
      input.reply
    );
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

  private async getEmailOtpRequest(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.emailOtpSignInAllowed) throw uiNotFound();
    const active = await this.requireContext(input, "login");
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const csrf = await this.authorizationContexts.createCsrfToken(
      input.runtime,
      active.opaqueId,
      "email-otp-request"
    );
    const body = `<h1>${escapeHtml(t("emailOtpTitle"))}</h1><p class="muted">${escapeHtml(
      t("emailOtpRequestHint")
    )}</p><form method="post" action="./email-otp/request">
      ${hiddenInput("csrf", csrf)}
      <div class="field"><label for="email">${escapeHtml(t("email"))}</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="320"></div>
      <button type="submit">${escapeHtml(t("sendEmailOtp"))}</button>
    </form><nav class="links"><a href="./login">${escapeHtml(
      t("backToSignIn")
    )}</a></nav>`;
    await sendHtml(input.reply, input.runtime, t("emailOtpTitle"), body);
  }

  private async postEmailOtpRequest(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.emailOtpSignInAllowed) throw uiNotFound();
    const startedAt = Date.now();
    const form = parseForm(input.raw);
    const email = parseEmail(singleFormValue(form, "email", 3, 320));
    const active = await this.requireContext(input, "login");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      "email-otp-request",
      singleFormValue(form, "csrf", 16, 1024)
    );
    await this.kernel.applicationAuthRateLimiter.assertEmailOtpRequest({
      applicationId: input.runtime.applicationId,
      normalizedEmail: email,
      ip: input.request.ip,
      secret: this.rateLimitSecret(input.runtime),
    });

    let response: Response;
    try {
      response = await this.callBetterAuth(
        input,
        "/email-otp/send-verification-otp",
        { email, type: "sign-in" }
      );
    } catch {
      await waitForEmailOtpGenericResponseFloor(startedAt);
      throw emailOtpDeliveryUnavailable();
    }
    await waitForEmailOtpGenericResponseFloor(startedAt);
    if (!response.ok) {
      if (response.status === 429) {
        throw new ApplicationAuthRateLimitError(
          429,
          readRetryAfterSeconds(response.headers.get("retry-after")),
          "slow_down"
        );
      }
      throw emailOtpDeliveryUnavailable();
    }

    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "login" }
    );
    await redirectToUi(input, "/email-otp/verify", [
      await this.authorizationContexts.serializeCookie(
        input.runtime,
        rotated.opaqueId
      ),
    ]);
  }

  private async getEmailOtpVerify(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.emailOtpSignInAllowed) throw uiNotFound();
    const active = await this.requireContext(input, "login");
    await this.renderEmailOtpVerify(input, active);
  }

  private async renderEmailOtpVerify(
    input: HandlerInput,
    active: ActiveApplicationAuthorizationContext,
    error = false
  ): Promise<void> {
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const csrf = await this.authorizationContexts.createCsrfToken(
      input.runtime,
      active.opaqueId,
      "email-otp-verify"
    );
    const body = `<h1>${escapeHtml(t("emailOtpVerifyTitle"))}</h1>${renderMessage(
      input.runtime,
      "success",
      "emailOtpAccepted"
    )}<p class="muted">${escapeHtml(t("emailOtpVerifyHint"))}</p>${
      error ? renderMessage(input.runtime, "error", "genericAuthError") : ""
    }<form method="post" action="./verify">
      ${hiddenInput("csrf", csrf)}
      <div class="field"><label for="email">${escapeHtml(t("email"))}</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="320"></div>
      <div class="field"><label for="otp">${escapeHtml(t("emailOtpCode"))}</label><input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" required minlength="6" maxlength="6" pattern="[0-9]{6}"></div>
      <button type="submit">${escapeHtml(t("verifyEmailOtp"))}</button>
    </form><nav class="links"><a href="../email-otp">${escapeHtml(
      t("resendEmailOtp")
    )}</a><a href="../login">${escapeHtml(t("backToSignIn"))}</a></nav>`;
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
      t("emailOtpVerifyTitle"),
      body
    );
  }

  private async postEmailOtpVerify(input: HandlerInput): Promise<void> {
    if (!input.runtime.policy.emailOtpSignInAllowed) throw uiNotFound();
    const form = parseForm(input.raw);
    const email = parseEmail(singleFormValue(form, "email", 3, 320));
    const otp = parseEmailOtp(singleFormValue(form, "otp", 6, 6));
    const active = await this.requireContext(input, "login");
    await this.authorizationContexts.assertCsrfToken(
      input.runtime,
      active,
      "email-otp-verify",
      singleFormValue(form, "csrf", 16, 1024)
    );
    await this.kernel.applicationAuthRateLimiter.assertEmailOtpVerify({
      applicationId: input.runtime.applicationId,
      verificationId: emailOtpVerificationId(email),
      ip: input.request.ip,
      secret: this.rateLimitSecret(input.runtime),
    });
    const rotated = await this.authorizationContexts.rotate(
      input.runtime,
      active,
      { currentStep: "login" }
    );
    let response: Response;
    try {
      response = await this.callBetterAuth(input, "/sign-in/email-otp", {
        email,
        otp,
        oauth_query:
          await this.authorizationContexts.buildSignedOAuthQuery(
            input.runtime,
            rotated
          ),
      });
    } catch {
      input.reply.header(
        "set-cookie",
        await this.authorizationContexts.serializeCookie(
          input.runtime,
          rotated.opaqueId
        )
      );
      throw new ApplicationAuthRequestError(
        "Email OTP sign-in could not be completed",
        503,
        "temporarily_unavailable"
      );
    }
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
    await this.renderEmailOtpVerify(input, rotated, true);
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

  private async getAccountConnections(input: HandlerInput): Promise<void> {
    const session = await this.readCurrentSession(input);
    const accounts = await this.readCurrentAccounts(input);
    const fresh = isFreshApplicationSession(session.session.createdAt);
    const t = createApplicationAuthTranslator(input.runtime.defaultLocale);
    const query = parseRawSearchParams(input.raw.rawQuery);
    const hasError = query.getAll("error").length > 0;
    const updated = query.getAll("updated").length === 1;
    const providers = (["google", "facebook"] as const)
      .map((provider) => {
        const matches = accounts.filter(
          (account) => account.providerId === provider
        );
        const enabled =
          input.runtime.routeManifest.allowedSocialProviders.includes(provider);
        const label =
          provider === "google" ? t("googleProvider") : t("facebookProvider");
        if (matches.length === 0 && !enabled) return "";
        if (matches.length === 1) {
          const unlink = fresh
            ? `<form method="post" action="./connections/unlink">
                ${hiddenInput("provider", provider)}
                ${hiddenInput(
                  "csrf",
                  createAccountConnectionCsrf(
                    this.kernel,
                    input.runtime,
                    session.session.id,
                    `unlink:${provider}`
                  )
                )}
                <button class="button-secondary" type="submit">${escapeHtml(
                  t("disconnectProvider")
                )}</button>
              </form>`
            : `<p class="muted">${escapeHtml(t("freshSessionRequired"))}</p>`;
          return `<section class="connection"><div><strong>${escapeHtml(
            label
          )}</strong><p class="muted">${escapeHtml(
            t("providerConnected")
          )}</p></div>${unlink}</section>`;
        }
        if (matches.length > 1) {
          return `<section class="connection"><div><strong>${escapeHtml(
            label
          )}</strong><p class="muted">${escapeHtml(
            t("providerConflict")
          )}</p></div></section>`;
        }
        const link = fresh
          ? `<form method="post" action="./connections/link">
              ${hiddenInput("provider", provider)}
              ${hiddenInput(
                "csrf",
                createAccountConnectionCsrf(
                  this.kernel,
                  input.runtime,
                  session.session.id,
                  `link:${provider}`
                )
              )}
              <button type="submit">${escapeHtml(t("connectProvider"))}</button>
            </form>`
          : `<p class="muted">${escapeHtml(t("freshSessionRequired"))}</p>`;
        return `<section class="connection"><div><strong>${escapeHtml(
          label
        )}</strong><p class="muted">${escapeHtml(
          t("providerNotConnected")
        )}</p></div>${link}</section>`;
      })
      .filter(Boolean)
      .join("");
    const status = hasError
      ? renderMessage(input.runtime, "error", "connectionFailed")
      : updated
        ? renderMessage(input.runtime, "success", "connectionsUpdated")
        : "";
    const body = `<h1>${escapeHtml(t("connectionsTitle"))}</h1><p class="muted">${escapeHtml(
      t("connectionsHint")
    )}</p>${status}${providers || `<p>${escapeHtml(t("noSocialProviders"))}</p>`}`;
    await sendHtml(
      input.reply,
      input.runtime,
      t("connectionsTitle"),
      body
    );
  }

  private async postAccountConnectionLink(input: HandlerInput): Promise<void> {
    const form = parseForm(input.raw);
    const provider = parseSocialProvider(
      singleFormValue(form, "provider", 6, 8)
    );
    let session: ApplicationAuthCurrentSession;
    try {
      session = await this.readCurrentSession(input);
    } catch (error) {
      await this.recordAccountAudit(input, {
        action: "account_link",
        outcome: "failure",
        reasonCategory: "session_missing",
        provider,
      });
      throw error;
    }
    if (!input.runtime.routeManifest.allowedSocialProviders.includes(provider)) {
      await this.recordAccountAudit(input, {
        action: "account_link",
        outcome: "failure",
        reasonCategory: "provider_disabled",
        provider,
        actorId: session.user.id,
      });
      throw uiNotFound();
    }
    if (!isFreshApplicationSession(session.session.createdAt)) {
      await this.recordAccountAudit(input, {
        action: "account_link",
        outcome: "failure",
        reasonCategory: "session_not_fresh",
        provider,
        actorId: session.user.id,
      });
      throw new ApplicationAuthRequestError(
        "A recent application session is required",
        403,
        "access_denied"
      );
    }
    try {
      assertAccountConnectionCsrf(
        this.kernel,
        input.runtime,
        session.session.id,
        `link:${provider}`,
        singleFormValue(form, "csrf", 16, 1024)
      );
    } catch (error) {
      await this.recordAccountAudit(input, {
        action: "account_link",
        outcome: "failure",
        reasonCategory: "invalid_request",
        provider,
        actorId: session.user.id,
      });
      throw error;
    }
    const connectionsUrl = `${input.runtime.issuer}/account/connections`;
    let response: Response;
    try {
      response = await this.callBetterAuth(input, "/link-social", {
        provider,
        callbackURL: connectionsUrl,
        errorCallbackURL: connectionsUrl,
      });
    } catch (error) {
      await this.recordAccountAudit(input, {
        action: "account_link",
        outcome: "failure",
        reasonCategory: "linking_failed",
        provider,
        actorId: session.user.id,
      });
      throw error;
    }
    if (!response.ok || !response.headers.has("location")) {
      await this.recordAccountAudit(input, {
        action: "account_link",
        outcome: "failure",
        reasonCategory: mapBetterAuthAccountError(
          await readBetterAuthErrorCode(response)
        ),
        provider,
        actorId: session.user.id,
      });
      throw new ApplicationAuthRequestError(
        "Account connection could not be started",
        response.status === 403 ? 403 : 400,
        "access_denied"
      );
    }
    await sendApplicationAuthFetchResponse(
      asBrowserRedirect(response),
      input.reply
    );
  }

  private async postAccountConnectionUnlink(input: HandlerInput): Promise<void> {
    const form = parseForm(input.raw);
    const provider = parseSocialProvider(
      singleFormValue(form, "provider", 6, 8)
    );
    let session: ApplicationAuthCurrentSession;
    try {
      session = await this.readCurrentSession(input);
    } catch (error) {
      await this.recordAccountAudit(input, {
        action: "account_unlink",
        outcome: "failure",
        reasonCategory: "session_missing",
        provider,
      });
      throw error;
    }
    if (!isFreshApplicationSession(session.session.createdAt)) {
      await this.recordAccountAudit(input, {
        action: "account_unlink",
        outcome: "failure",
        reasonCategory: "session_not_fresh",
        provider,
        actorId: session.user.id,
      });
      throw new ApplicationAuthRequestError(
        "A recent application session is required",
        403,
        "access_denied"
      );
    }
    try {
      assertAccountConnectionCsrf(
        this.kernel,
        input.runtime,
        session.session.id,
        `unlink:${provider}`,
        singleFormValue(form, "csrf", 16, 1024)
      );
    } catch (error) {
      await this.recordAccountAudit(input, {
        action: "account_unlink",
        outcome: "failure",
        reasonCategory: "invalid_request",
        provider,
        actorId: session.user.id,
      });
      throw error;
    }
    let matchingAccounts: ApplicationAuthAccount[];
    try {
      matchingAccounts = (await this.readCurrentAccounts(input)).filter(
        (account) => account.providerId === provider
      );
    } catch (error) {
      await this.recordAccountAudit(input, {
        action: "account_unlink",
        outcome: "failure",
        reasonCategory: "unknown",
        provider,
        actorId: session.user.id,
      });
      throw error;
    }
    if (matchingAccounts.length !== 1) {
      await this.recordAccountAudit(input, {
        action: "account_unlink",
        outcome: "failure",
        reasonCategory:
          matchingAccounts.length === 0 ? "invalid_request" : "account_conflict",
        provider,
        actorId: session.user.id,
      });
      throw new ApplicationAuthRequestError(
        "Account connection could not be removed",
        400,
        "invalid_request"
      );
    }
    let response: Response;
    try {
      response = await this.callBetterAuth(input, "/unlink-account", {
        providerId: provider,
      });
    } catch (error) {
      await this.recordAccountAudit(input, {
        action: "account_unlink",
        outcome: "failure",
        reasonCategory: "unknown",
        provider,
        actorId: session.user.id,
      });
      throw error;
    }
    if (!response.ok) {
      await this.recordAccountAudit(input, {
        action: "account_unlink",
        outcome: "failure",
        reasonCategory: mapBetterAuthAccountError(
          await readBetterAuthErrorCode(response)
        ),
        provider,
        actorId: session.user.id,
      });
      throw new ApplicationAuthRequestError(
        "Account connection could not be removed",
        response.status === 403 ? 403 : 400,
        "access_denied"
      );
    }
    await this.recordAccountAudit(input, {
      action: "account_unlink",
      outcome: "success",
      reasonCategory: "success",
      provider,
      actorId: session.user.id,
    });
    await redirectToUi(input, "/account/connections?updated=1", []);
  }

  private async recordAccountAudit(
    input: HandlerInput,
    event: {
      action: "account_link" | "account_unlink";
      outcome: "success" | "failure";
      reasonCategory: ApplicationAuthAuditReasonCategory;
      provider: "google" | "facebook";
      actorId?: string;
    }
  ): Promise<void> {
    await this.kernel.applicationAuthAudit.record({
      ...event,
      actorType: event.actorId ? "application_user" : "anonymous",
      organizationId: input.runtime.organizationId,
      applicationId: input.runtime.applicationId,
      secretKeyVersion: input.runtime.secretKeyVersion,
      requestId: String(input.request.id),
    });
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
    return (await this.readCurrentSession(input)).session.id;
  }

  private async readCurrentSession(
    input: HandlerInput
  ): Promise<ApplicationAuthCurrentSession> {
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
    const value = (await response.json()) as {
      session?: { id?: unknown; createdAt?: unknown };
      user?: { id?: unknown };
    };
    if (
      typeof value.session?.id !== "string" ||
      (typeof value.session.createdAt !== "string" &&
        !(value.session.createdAt instanceof Date)) ||
      typeof value.user?.id !== "string"
    ) {
      throw new ApplicationAuthRequestError("Application session is unavailable");
    }
    const createdAt = new Date(value.session.createdAt);
    if (!Number.isFinite(createdAt.getTime())) {
      throw new ApplicationAuthRequestError("Application session is unavailable");
    }
    return {
      session: { id: value.session.id, createdAt },
      user: { id: value.user.id },
    };
  }

  private async readCurrentAccounts(
    input: HandlerInput
  ): Promise<ApplicationAuthAccount[]> {
    const headers = new Headers({
      accept: "application/json",
      host: new URL(input.publicBaseUrl).host,
      origin: input.publicBaseUrl,
      "x-forwarded-for": input.request.ip,
      "x-request-id": String(input.request.id),
    });
    if (input.request.headers.cookie) {
      headers.set("cookie", input.request.headers.cookie);
    }
    const response = await input.runtime.auth.handler(
      new Request(`${input.runtime.issuer}/list-accounts`, {
        method: "GET",
        headers,
      })
    );
    if (!response.ok) {
      throw new ApplicationAuthRequestError("Application accounts are unavailable");
    }
    const value: unknown = await response.json();
    if (!Array.isArray(value)) {
      throw new ApplicationAuthRequestError("Application accounts are unavailable");
    }
    return value.map((account) => {
      if (
        !account ||
        typeof account !== "object" ||
        typeof (account as { providerId?: unknown }).providerId !== "string"
      ) {
        throw new ApplicationAuthRequestError(
          "Application accounts are unavailable"
        );
      }
      return {
        providerId: (account as { providerId: string }).providerId,
      };
    });
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

interface ApplicationAuthCurrentSession {
  session: { id: string; createdAt: Date };
  user: { id: string };
}

interface ApplicationAuthAccount {
  providerId: string;
}

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

function parseSocialProvider(value: string): "google" | "facebook" {
  if (value !== "google" && value !== "facebook") {
    throw new ApplicationAuthRequestError("Social provider is invalid");
  }
  return value;
}

function isFreshApplicationSession(createdAt: Date): boolean {
  const age = Date.now() - createdAt.getTime();
  return age >= -60_000 && age < 10 * 60 * 1_000;
}

function createAccountConnectionCsrf(
  kernel: Kernel,
  runtime: ApplicationAuthFactoryRuntime,
  sessionId: string,
  action: string
): string {
  const secret = kernel.applicationAuthSecrets.derivePurposeSecret(
    runtime.applicationId,
    runtime.secretKeyVersion,
    "account-connections"
  );
  return createHmac("sha256", secret)
    .update(
      `shopana:iam:application-auth-account-connections:v1\0${runtime.applicationId}\0${sessionId}\0${action}`,
      "utf8"
    )
    .digest("base64url");
}

function assertAccountConnectionCsrf(
  kernel: Kernel,
  runtime: ApplicationAuthFactoryRuntime,
  sessionId: string,
  action: string,
  actual: string
): void {
  const expected = createAccountConnectionCsrf(
    kernel,
    runtime,
    sessionId,
    action
  );
  if (!constantTimeEqual(actual, expected)) {
    throw new ApplicationAuthRequestError("CSRF token is invalid");
  }
}

async function readBetterAuthErrorCode(
  response: Response
): Promise<string | null> {
  try {
    const value = (await response.clone().json()) as {
      code?: unknown;
      error?: { code?: unknown };
    };
    if (typeof value.code === "string") return value.code;
    return typeof value.error?.code === "string" ? value.error.code : null;
  } catch {
    return null;
  }
}

function mapBetterAuthAccountError(
  code: string | null
): ApplicationAuthAuditReasonCategory {
  switch (code?.toUpperCase()) {
    case "SESSION_NOT_FRESH":
      return "session_not_fresh";
    case "FAILED_TO_UNLINK_LAST_ACCOUNT":
      return "last_login_method";
    case "ACCOUNT_NOT_FOUND":
      return "invalid_request";
    case "LINKING_DIFFERENT_EMAILS_NOT_ALLOWED":
      return "email_mismatch";
    case "LINKING_FAILED":
      return "linking_failed";
    default:
      return "unknown";
  }
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

function parseEmailOtp(value: string): string {
  if (!/^\d{6}$/u.test(value)) {
    throw new ApplicationAuthRequestError("Email OTP is invalid");
  }
  return value;
}

function emailOtpVerificationId(normalizedEmail: string): string {
  return `sign-in-otp-${normalizedEmail}`;
}

async function waitForEmailOtpGenericResponseFloor(
  startedAt: number
): Promise<void> {
  const remaining =
    EMAIL_OTP_GENERIC_RESPONSE_FLOOR_MS - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, remaining));
}

function emailOtpDeliveryUnavailable(): ApplicationAuthRequestError {
  return new ApplicationAuthRequestError(
    "Authentication message could not be accepted",
    503,
    "temporarily_unavailable"
  );
}

function readRetryAfterSeconds(value: string | null): number {
  if (!value || !/^\d{1,6}$/u.test(value)) return 60;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 60;
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

function asBrowserRedirect(response: Response): Response {
  const location = response.headers.get("location");
  if (!location) return response;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-type");
  return new Response(null, {
    status: 303,
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
