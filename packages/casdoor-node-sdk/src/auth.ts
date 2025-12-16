// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Client } from "./client.js";
import type { OAuth2Token, Claims, User } from "./types.js";
import jwt from "jsonwebtoken";

/**
 * getOAuthToken gets the pivotal and necessary secret to interact with the Casdoor server
 */
export async function getOAuthToken(
  client: Client,
  code: string,
  _state: string
): Promise<OAuth2Token> {
  const tokenUrl = `${client.endpoint}/api/login/oauth/access_token`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: client.clientId,
    client_secret: client.clientSecret,
    code,
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = (await resp.json()) as {
    access_token: string;
    token_type: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (data.access_token.startsWith("error:")) {
    throw new Error(data.access_token.replace("error: ", ""));
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    refreshToken: data.refresh_token,
    expiry: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
  };
}

/**
 * refreshOAuthToken refreshes the OAuth token
 */
export async function refreshOAuthToken(
  client: Client,
  refreshToken: string
): Promise<OAuth2Token> {
  const tokenUrl = `${client.endpoint}/api/login/oauth/refresh_token`;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: refreshToken,
  });

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = (await resp.json()) as {
    access_token: string;
    token_type: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (data.access_token.startsWith("error:")) {
    throw new Error(data.access_token.replace("error: ", ""));
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    refreshToken: data.refresh_token,
    expiry: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : undefined,
  };
}

/**
 * parseJwtToken parses JWT token with RSA verification
 */
export function parseJwtToken(client: Client, token: string): Claims {
  if (!client.certificate) {
    throw new Error("Certificate is required to parse JWT token");
  }

  const decoded = jwt.verify(token, client.certificate, {
    algorithms: ["RS256"],
  }) as jwt.JwtPayload & { user?: User; accessToken?: string; tokenType?: string; TokenType?: string };

  // Map JWT claims to Claims interface
  return {
    user: decoded.user || ({} as User),
    accessToken: decoded.accessToken || "",
    iss: decoded.iss || "",
    sub: decoded.sub || "",
    aud: decoded.aud || "",
    exp: decoded.exp || 0,
    nbf: decoded.nbf || 0,
    iat: decoded.iat || 0,
    jti: decoded.jti || "",
    tokenType: decoded.tokenType || "",
    TokenType: decoded.TokenType || "",
  };
}

/**
 * parseJwtTokenWithoutVerify parses JWT token without verification (for debugging)
 */
export function parseJwtTokenWithoutVerify(token: string): Claims {
  const decoded = jwt.decode(token, { complete: true }) as {
    payload: jwt.JwtPayload & { user?: User; accessToken?: string; tokenType?: string; TokenType?: string };
  } | null;

  if (!decoded) {
    throw new Error("Invalid JWT token");
  }

  const payload = decoded.payload;

  return {
    user: payload.user || ({} as User),
    accessToken: payload.accessToken || "",
    iss: payload.iss || "",
    sub: payload.sub || "",
    aud: payload.aud || "",
    exp: payload.exp || 0,
    nbf: payload.nbf || 0,
    iat: payload.iat || 0,
    jti: payload.jti || "",
    tokenType: payload.tokenType || "",
    TokenType: payload.TokenType || "",
  };
}

/**
 * isRefreshToken returns true if the token is a refresh token
 */
export function isRefreshToken(claims: Claims): boolean {
  return claims.TokenType === "refresh-token";
}

/**
 * Get sign-in URL
 */
export function getSigninUrl(
  client: Client,
  redirectUri: string,
  state: string = ""
): string {
  const params = new URLSearchParams({
    client_id: client.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "read",
    state: state || client.applicationName,
  });

  return `${client.endpoint}/login/oauth/authorize?${params.toString()}`;
}

/**
 * Get signup URL
 */
export function getSignupUrl(
  client: Client,
  redirectUri: string,
  state: string = ""
): string {
  return getSigninUrl(client, redirectUri, state).replace(
    "/login/oauth/authorize",
    "/signup/oauth/authorize"
  );
}

/**
 * Get user profile URL
 */
export function getUserProfileUrl(
  client: Client,
  username: string,
  accessToken: string | null = null
): string {
  let url = `${client.endpoint}/users/${client.organizationName}/${username}`;
  if (accessToken) {
    url += `?access_token=${accessToken}`;
  }
  return url;
}

/**
 * Get my profile URL
 */
export function getMyProfileUrl(
  client: Client,
  accessToken: string | null = null
): string {
  let url = `${client.endpoint}/account`;
  if (accessToken) {
    url += `?access_token=${accessToken}`;
  }
  return url;
}
