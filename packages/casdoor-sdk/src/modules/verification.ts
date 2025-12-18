import FormData from "form-data";
import type { CasdoorApiResponse, CasdoorHttpResult, RequestContext } from "../types/api.js";
import { CasdoorHttpClient } from "../http/httpClient.js";

export interface SendVerificationCodeRequest {
  captchaType: string;
  captchaToken: string;
  clientSecret: string;
  method: string;
  countryCode?: string;
  dest: string;
  type: string;
  applicationId: string;
  checkUser?: string;
}

export class VerificationModule {
  constructor(private readonly http: CasdoorHttpClient) {}

  async sendVerificationCode(
    ctx: RequestContext,
    req: SendVerificationCodeRequest,
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const form = new FormData();
    for (const [k, v] of Object.entries(req)) {
      if (v === undefined) continue;
      form.append(k, String(v));
    }

    return this.http.post(ctx, "/api/send-verification-code", form, {
      headers: form.getHeaders() as unknown as Record<string, string>,
      maxBodyLength: Infinity,
    });
  }

  verifyCode(ctx: RequestContext, values: Record<string, unknown>): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    return this.http.post(ctx, "/api/verify-code", values);
  }

  checkUserPassword(ctx: RequestContext, values: Record<string, unknown>): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    return this.http.post(ctx, "/api/check-user-password", values);
  }

  getCaptchaStatus(
    ctx: RequestContext,
    values: { organization: string; userId: string; application: string },
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams(values);
    return this.http.get(ctx, `/api/get-captcha-status?${params.toString()}`);
  }

  getCaptcha(
    ctx: RequestContext,
    values: { applicationId: string; isCurrentProvider?: boolean },
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({
      applicationId: values.applicationId,
      isCurrentProvider: String(values.isCurrentProvider ?? false),
    });
    return this.http.get(ctx, `/api/get-captcha?${params.toString()}`);
  }
}
