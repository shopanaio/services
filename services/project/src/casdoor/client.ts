import {
  Client,
  createClient,
  type AuthConfig,
  type Claims,
} from "@shopana/casdoor-node-sdk";
import { config } from "../config.js";

/**
 * Response status constants
 */
export const StatusOk = "ok";
export const ResponseTypeCode = "code";
export const ResponseTypeToken = "token";
export const MethodSignIn = "signin";
export const MethodSignUp = "signup";
export const SignInMethodPassword = "Password";

/**
 * OAuth2 token response
 */
export interface OAuth2Token {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  expiry?: Date;
}

/**
 * Casdoor client wrapper over @shopana/casdoor-node-sdk
 * Similar to Go SDK wrapper in platform/project/app/casdoor
 */
export class CasdoorClient {
  private readonly client: Client;

  constructor() {
    const casdoorConfig = config.casdoor;

    if (!casdoorConfig.endpoint) {
      throw new Error("Casdoor endpoint is required");
    }
    if (!casdoorConfig.clientId) {
      throw new Error("Casdoor clientId is required");
    }
    if (!casdoorConfig.clientSecret) {
      throw new Error("Casdoor clientSecret is required");
    }
    if (!casdoorConfig.organizationName) {
      throw new Error("Casdoor organizationName is required");
    }
    if (!casdoorConfig.applicationName) {
      throw new Error("Casdoor applicationName is required");
    }

    const authConfig: AuthConfig = {
      endpoint: casdoorConfig.endpoint,
      clientId: casdoorConfig.clientId,
      clientSecret: casdoorConfig.clientSecret,
      certificate: casdoorConfig.certificate ?? "",
      organizationName: casdoorConfig.organizationName,
      applicationName: casdoorConfig.applicationName,
    };

    this.client = createClient(authConfig);
  }

  /**
   * Get the underlying SDK client
   */
  get sdkClient(): Client {
    return this.client;
  }

  /**
   * Get configuration values
   */
  get endpoint(): string {
    return this.client.endpoint;
  }

  get clientId(): string {
    return this.client.clientId;
  }

  get clientSecret(): string {
    return this.client.clientSecret;
  }

  get organizationName(): string {
    return this.client.organizationName;
  }

  get applicationName(): string {
    return this.client.applicationName;
  }

  /**
   * Get OAuth2 password credentials token
   */
  async getOAuthPasswordCredentialsToken(
    email: string,
    password: string
  ): Promise<OAuth2Token> {
    const tokenUrl = `${this.endpoint}/api/login/oauth/access_token`;

    const params = new URLSearchParams({
      grant_type: "password",
      username: email,
      password: password,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "profile openid email",
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get token: ${errorData}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      refresh_token?: string;
      expires_in?: number;
    };

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
   * Get OAuth2 client credentials token
   */
  async getOAuthClientCredentialsToken(): Promise<OAuth2Token> {
    const tokenUrl = `${this.endpoint}/api/login/oauth/access_token`;

    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "profile email",
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to get token: ${errorData}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiry: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  /**
   * Parse user ID from JWT token
   */
  parseUserIdByJwtToken(accessToken: string): string {
    const claims = this.parseJwtToken(accessToken);
    return claims.sub;
  }

  /**
   * Parse JWT token with verification
   */
  parseJwtToken(token: string): Claims {
    return this.client.parseJwtToken(token);
  }

  /**
   * Parse JWT token without verification (for debugging)
   */
  parseJwtTokenWithoutVerify(token: string): Claims {
    return this.client.parseJwtTokenWithoutVerify(token);
  }

  /**
   * Load certificate by name
   */
  async loadCert(certName: string): Promise<this> {
    const cert = await this.client.getCert(certName);
    if (cert) {
      this.client.certificate = cert.certificate;
    }
    return this;
  }

  /**
   * Get username from email (replace @ with _)
   */
  getUserName(email: string): string {
    return email.replace(/@/g, "_");
  }
}
