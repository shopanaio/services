import { type Response } from "@shopana/casdoor-node-sdk";
import {
  CasdoorClient,
  ResponseTypeToken,
  SignInMethodPassword,
  StatusOk,
} from "./client.js";

/**
 * Sign in input
 */
export interface SignInInput {
  organization: string;
  email: string;
  password: string;
  application: string;
}

/**
 * Sign in payload sent to Casdoor
 */
interface SignInPayload {
  application: string;
  autoSignin: boolean;
  organization: string;
  password: string;
  signinMethod: string;
  type: string;
  username: string;
}

/**
 * OAuth2 provider sign up/sign in input
 */
export interface OAuth2ProviderSignUpInput {
  provider: string;
  code: string;
  application: string;
  redirectUri: string;
}

/**
 * OAuth2 provider payload
 */
interface OAuth2ProviderPayload {
  type: string;
  application: string;
  provider: string;
  code: string;
  state: string;
  redirectUri: string;
  method: string;
}

/**
 * Casdoor login/authentication methods
 * Wrapper over @shopana/casdoor-node-sdk
 */
export class CasdoorLogin {
  constructor(private readonly casdoorClient: CasdoorClient) {}

  /**
   * Sign in with email and password
   */
  async signIn(input: SignInInput): Promise<string> {
    const payload: SignInPayload = {
      organization: input.organization,
      application: input.application,
      signinMethod: SignInMethodPassword,
      type: ResponseTypeToken,
      autoSignin: true,
      password: input.password,
      username: input.email,
    };

    const url = `${this.casdoorClient.endpoint}/api/login?clientId=${this.casdoorClient.clientId}&responseType=${ResponseTypeToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const result = (await response.json()) as Response<string>;

    if (result.status !== StatusOk) {
      throw new Error(`Failed to login: ${result.msg}`);
    }

    const accessToken = result.data;
    if (typeof accessToken !== "string") {
      throw new Error(`Failed to login: invalid response data`);
    }

    return accessToken;
  }

  /**
   * Sign up with OAuth2 provider (e.g., Google)
   */
  async signUpWithOAuth2Provider(
    input: OAuth2ProviderSignUpInput
  ): Promise<string> {
    const payload: OAuth2ProviderPayload = {
      application: input.application,
      code: input.code,
      provider: input.provider,
      redirectUri: input.redirectUri,
      state: input.application,
      method: "signup",
      type: ResponseTypeToken,
    };

    const url = `${this.casdoorClient.endpoint}/api/login?clientId=${this.casdoorClient.clientId}&responseType=${ResponseTypeToken}&redirectUri=${input.redirectUri}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const result = (await response.json()) as Response<string>;

    if (result.status !== StatusOk) {
      throw new Error(`Failed to login with OAuth provider: ${result.msg}`);
    }

    const accessToken = result.data;
    if (typeof accessToken !== "string") {
      throw new Error(`Failed to login with OAuth provider: invalid response`);
    }

    return accessToken;
  }

  /**
   * Sign in with OAuth2 provider (for existing users)
   */
  async signInWithOAuth2Provider(
    input: OAuth2ProviderSignUpInput
  ): Promise<string> {
    const payload: OAuth2ProviderPayload = {
      application: input.application,
      code: input.code,
      provider: input.provider,
      redirectUri: input.redirectUri,
      state: input.application,
      method: "signin",
      type: ResponseTypeToken,
    };

    const url = `${this.casdoorClient.endpoint}/api/login?clientId=${this.casdoorClient.clientId}&responseType=${ResponseTypeToken}&redirectUri=${input.redirectUri}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const result = (await response.json()) as Response<string>;

    if (result.status !== StatusOk) {
      throw new Error(`Failed to login with OAuth provider: ${result.msg}`);
    }

    const accessToken = result.data;
    if (typeof accessToken !== "string") {
      throw new Error(`Failed to login with OAuth provider: invalid response`);
    }

    return accessToken;
  }

  /**
   * Get OAuth authorization URL
   */
  getOAuthAuthorizationUrl(
    provider: string,
    redirectUri: string,
    state?: string
  ): string {
    const params = new URLSearchParams({
      client_id: this.casdoorClient.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "profile openid email",
      state: state ?? this.casdoorClient.applicationName,
      provider,
    });

    return `${this.casdoorClient.endpoint}/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for OAuth token (standard OAuth2 flow)
   */
  async getOAuthToken(code: string, state: string) {
    return this.casdoorClient.sdkClient.getOAuthToken(code, state);
  }
}
