import {
  CasdoorConfig,
  CasdoorResponse,
  OAuth2Token,
  CasdoorJwtClaims,
} from "./types.js";

/**
 * Casdoor client for authentication operations
 */
export class CasdoorClient {
  private readonly endpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly applicationName: string;
  private readonly organizationName: string;
  public certificate: string;

  constructor(config: CasdoorConfig) {
    this.endpoint = config.endpoint;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.applicationName = config.applicationName;
    this.organizationName = config.organizationName;
    this.certificate = config.certificate ?? "";
  }

  /**
   * Get configuration values
   */
  get config() {
    return {
      endpoint: this.endpoint,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      applicationName: this.applicationName,
      organizationName: this.organizationName,
    };
  }

  /**
   * Build URL with query parameters
   */
  getUrl(action: string, queryMap: Record<string, string> = {}): string {
    const url = new URL(`/api/${action}`, this.endpoint);
    Object.entries(queryMap).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }

  /**
   * Perform GET request and return bytes
   */
  async doGetBytes(url: string): Promise<Buffer> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Perform GET request and return parsed response
   */
  async doGetResponse<T>(url: string): Promise<CasdoorResponse<T>> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<CasdoorResponse<T>>;
  }

  /**
   * Perform POST request
   */
  async doPost<T>(
    action: string,
    queryMap: Record<string, string>,
    body: unknown
  ): Promise<CasdoorResponse<T>> {
    const url = this.getUrl(action, queryMap);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<CasdoorResponse<T>>;
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
   * Parse JWT token without verification (for extracting claims)
   */
  parseJwtToken(token: string): CasdoorJwtClaims {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT token format");
    }

    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload) as CasdoorJwtClaims;
  }

  /**
   * Load certificate by name
   */
  async loadCert(certName: string): Promise<this> {
    const cert = await this.getCert(certName);
    this.certificate = cert.certificate;
    return this;
  }

  /**
   * Get certificate from Casdoor
   */
  async getCert(
    certName: string
  ): Promise<{ owner: string; name: string; certificate: string }> {
    const url = this.getUrl("get-cert", {
      id: `${this.organizationName}/${certName}`,
    });

    const bytes = await this.doGetBytes(url);
    return JSON.parse(bytes.toString());
  }

  /**
   * Get username from email (replace @ with _)
   */
  getUserName(email: string): string {
    return email.replace("@", "_");
  }
}
