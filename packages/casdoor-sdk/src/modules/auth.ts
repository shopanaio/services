import type { CasdoorApiResponse, CasdoorHttpResult, RequestContext } from "../types/api.js";
import { CasdoorHttpClient } from "../http/httpClient.js";
import { oAuthParamsToQuery, casLoginParamsToQuery } from "./query.js";

export interface OAuthParams {
  clientId: string;
  responseType: string;
  redirectUri: string;
  type?: string;
  scope?: string;
  state?: string;
  nonce?: string;
  challengeMethod?: string;
  codeChallenge?: string;
}

export type GetAppLoginParams =
  | ({ type?: undefined } & Partial<OAuthParams>)
  | { type: "cas"; id?: string; service?: string }
  | { type: "device"; userCode: string };

export interface LoginRequest {
  application?: string;
  organization?: string;
  username?: string;
  password?: string;
  language?: string;
  signinMethod?: string;
  type?: string;
  // MFA continuation:
  mfaType?: string;
  passcode?: string;
  recoveryCode?: string;
  enableMfaRemember?: boolean;
  // Captcha:
  captchaType?: string;
  captchaToken?: string;
  captchaText?: string;
  // Provider-based:
  provider?: string;
  providerBack?: string;
  code?: string;
}

export type LoginResponse = CasdoorApiResponse<string, unknown, unknown>;

export class AuthModule {
  constructor(private readonly http: CasdoorHttpClient) {}

  getAccount(ctx: RequestContext, query = ""): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    return this.http.get(ctx, `/api/get-account${query}`);
  }

  signup(ctx: RequestContext, values: Record<string, unknown>): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    return this.http.post(ctx, "/api/signup", values);
  }

  getEmailAndPhone(
    ctx: RequestContext,
    organization: string,
    username: string,
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ organization, username });
    return this.http.get(ctx, `/api/get-email-and-phone?${params.toString()}`);
  }

  getApplicationLogin(ctx: RequestContext, params?: GetAppLoginParams): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    let query = "";
    if (params?.type === "cas") {
      query = casLoginParamsToQuery(params);
    } else if (params?.type === "device") {
      query = `?userCode=${encodeURIComponent(params.userCode)}&type=device`;
    } else {
      query = oAuthParamsToQuery(params);
    }
    return this.http.get(ctx, `/api/get-app-login${query}`);
  }

  login(ctx: RequestContext, values: LoginRequest, oAuthParams?: OAuthParams): Promise<CasdoorHttpResult<LoginResponse>> {
    const query = oAuthParamsToQuery(oAuthParams);
    return this.http.post(ctx, `/api/login${query}`, values);
  }

  loginCas(ctx: RequestContext, values: LoginRequest, cas: { service: string }): Promise<CasdoorHttpResult<LoginResponse>> {
    const params = new URLSearchParams({ service: cas.service });
    return this.http.post(ctx, `/api/login?${params.toString()}`, values);
  }

  loginWithSaml(ctx: RequestContext, values: LoginRequest, param: string): Promise<CasdoorHttpResult<LoginResponse>> {
    return this.http.post(ctx, `/api/login${param}`, values);
  }

  logout(ctx: RequestContext): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    return this.http.post(ctx, "/api/logout");
  }

  unlink(ctx: RequestContext, values: Record<string, unknown>): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    return this.http.post(ctx, "/api/unlink", values);
  }

  getSamlLogin(ctx: RequestContext, providerId: string, relayState: string): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ id: providerId, relayState });
    return this.http.get(ctx, `/api/get-saml-login?${params.toString()}`);
  }

  getWebhookEvent(ctx: RequestContext, ticket: string): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ ticket });
    return this.http.get(ctx, `/api/get-webhook-event?${params.toString()}`);
  }

  getQrCode(ctx: RequestContext, providerId: string): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ id: providerId });
    return this.http.get(ctx, `/api/get-qrcode?${params.toString()}`);
  }

  getCaptchaStatus(
    ctx: RequestContext,
    values: { organization: string; userId: string; application: string },
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams(values);
    return this.http.get(ctx, `/api/get-captcha-status?${params.toString()}`);
  }
}

