import { CasdoorClient } from "./client.js";
import {
  SignInInput,
  SignInPayload,
  OAuth2ProviderSignUpInput,
  OAuth2ProviderPayload,
  CasdoorResponse,
  StatusOk,
  ResponseTypeToken,
  SignInMethodPassword,
  MethodSignUp,
} from "./types.js";

/**
 * Casdoor login/authentication methods
 */
export class CasdoorLogin {
  constructor(private readonly client: CasdoorClient) {}

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

    const url = `${this.client.config.endpoint}/api/login?clientId=${this.client.config.clientId}&responseType=${ResponseTypeToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const result = (await response.json()) as CasdoorResponse<string>;

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
      method: MethodSignUp,
      type: ResponseTypeToken,
    };

    const url = `${this.client.config.endpoint}/api/login?clientId=${this.client.config.clientId}&responseType=${ResponseTypeToken}&redirectUri=${input.redirectUri}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const result = (await response.json()) as CasdoorResponse<string>;

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

    const url = `${this.client.config.endpoint}/api/login?clientId=${this.client.config.clientId}&responseType=${ResponseTypeToken}&redirectUri=${input.redirectUri}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const result = (await response.json()) as CasdoorResponse<string>;

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
    const { endpoint, clientId, applicationName } = this.client.config;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "profile openid email",
      state: state ?? applicationName,
      provider,
    });

    return `${endpoint}/login/oauth/authorize?${params.toString()}`;
  }
}
