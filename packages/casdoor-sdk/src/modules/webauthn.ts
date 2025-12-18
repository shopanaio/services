import type { CasdoorApiResponse, CasdoorHttpResult, RequestContext } from "../types/api.js";
import { CasdoorHttpClient } from "../http/httpClient.js";
import type { OAuthParams } from "./auth.js";

export class WebAuthnModule {
  constructor(private readonly http: CasdoorHttpClient) {}

  beginSignin(
    ctx: RequestContext,
    values: { owner: string; username?: string },
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ owner: values.owner });
    if (values.username) params.set("username", values.username);
    return this.http.get(ctx, `/api/webauthn/signin/begin?${params.toString()}`);
  }

  finishSignin(
    ctx: RequestContext,
    values: { responseType: string; body: unknown; oAuthParams?: OAuthParams },
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ responseType: values.responseType });
    const o = values.oAuthParams;
    if (o) {
      params.set("clientId", o.clientId);
      if (o.scope) params.set("scope", o.scope);
      params.set("redirectUri", o.redirectUri);
      if (o.nonce) params.set("nonce", o.nonce);
      if (o.state) params.set("state", o.state);
      if (o.codeChallenge) params.set("codeChallenge", o.codeChallenge);
      if (o.challengeMethod) params.set("challengeMethod", o.challengeMethod);
    }
    return this.http.post(ctx, `/api/webauthn/signin/finish?${params.toString()}`, values.body);
  }
}

