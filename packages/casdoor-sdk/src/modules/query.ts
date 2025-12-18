import type { OAuthParams } from "./auth.js";

export function casLoginParamsToQuery(casParams?: { type?: string; id?: string; service?: string }): string {
  return `?type=${encodeURIComponent(casParams?.type ?? "")}&id=${encodeURIComponent(casParams?.id ?? "")}&redirectUri=${encodeURIComponent(casParams?.service ?? "")}`;
}

export function oAuthParamsToQuery(oAuthParams?: Partial<OAuthParams> | null): string {
  if (!oAuthParams) return "";

  const params = new URLSearchParams();
  if (oAuthParams.clientId !== undefined) params.set("clientId", oAuthParams.clientId);
  if (oAuthParams.responseType !== undefined) params.set("responseType", oAuthParams.responseType);
  if (oAuthParams.redirectUri !== undefined) params.set("redirectUri", oAuthParams.redirectUri);
  if (oAuthParams.type !== undefined) params.set("type", oAuthParams.type);
  if (oAuthParams.scope !== undefined) params.set("scope", oAuthParams.scope);
  if (oAuthParams.state !== undefined) params.set("state", oAuthParams.state);
  if (oAuthParams.nonce !== undefined) params.set("nonce", oAuthParams.nonce);
  if (oAuthParams.challengeMethod !== undefined) params.set("code_challenge_method", oAuthParams.challengeMethod);
  if (oAuthParams.codeChallenge !== undefined) params.set("code_challenge", oAuthParams.codeChallenge);

  const s = params.toString();
  return s ? `?${s}` : "";
}

