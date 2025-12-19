import {
  CasdoorNodeClient,
  type CasdoorNodeClientConfig,
  type User,
  type RequestContext,
} from "@zaytra/casdoor-node-client-ext";

export interface CasdoorConfig {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  certificate?: string;
  organizationName: string;
  applicationName: string;
}

export interface CreateOrganizationInput {
  name: string;
  displayName: string;
}

export interface UserCreateInput {
  email: string;
  password: string;
}

export interface AuthTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignInResult {
  success: boolean;
  user: User | null;
  token: AuthTokenResult | null;
  error?: string;
}

export interface SignUpResult extends SignInResult {}

export interface GetCurrentUserResult {
  success: boolean;
  user: User | null;
  error?: string;
}

export class CasdoorAdapter {
  private readonly client: CasdoorNodeClient;
  public readonly organization: string;
  public readonly application: string;

  private constructor(
    client: CasdoorNodeClient,
    organization: string,
    application: string
  ) {
    this.client = client;
    this.organization = organization;
    this.application = application;
  }

  static async create(config: CasdoorConfig): Promise<CasdoorAdapter> {
    const tempClient = new CasdoorNodeClient({
      casdoorBaseUrl: config.endpoint,
      sdkConfig: {
        endpoint: config.endpoint,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        certificate: "",
        orgName: config.organizationName,
        appName: config.applicationName,
      },
      cookie: { mode: "forward" },
    });

    let certificate = "";

    if (config.certificate) {
      console.log("[IDENTITY] Fetching certificate:", config.certificate);
      const certResponse = await tempClient.sdk.getCert(config.certificate);
      certificate = certResponse.data?.data?.certificate ?? "";
      console.log(
        "[IDENTITY] Certificate fetched, length:",
        certificate.length
      );
    } else {
      console.warn("[IDENTITY] No certificate name in config");
    }

    const clientConfig: CasdoorNodeClientConfig = {
      casdoorBaseUrl: config.endpoint,
      sdkConfig: {
        endpoint: config.endpoint,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        certificate,
        orgName: config.organizationName,
        appName: config.applicationName,
      },
      cookie: { mode: "forward" },
    };

    const client = new CasdoorNodeClient(clientConfig);
    return new CasdoorAdapter(
      client,
      config.organizationName,
      config.applicationName
    );
  }

  get sdk() {
    return this.client.sdk;
  }

  get auth() {
    return this.client.auth;
  }

  async getCurrentUser(jwt: string): Promise<GetCurrentUserResult> {
    try {
      const jwtUser = this.client.sdk.parseJwtToken(jwt);

      if (!jwtUser.email) {
        return {
          success: false,
          user: null,
          error: "Invalid token: no email",
        };
      }

      const user = await this.findUserByEmail(jwtUser.email);

      if (!user) {
        return {
          success: false,
          user: null,
          error: "User not found",
        };
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        error: error instanceof Error ? error.message : "Invalid token",
      };
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const response = await this.client.sdk.getUser(email);
    return response.data?.data ?? null;
  }

  async signIn(
    input: UserCreateInput,
    ctx: RequestContext = {}
  ): Promise<SignInResult> {
    const { email, password } = input;

    try {
      const loginResponse = await this.client.auth.login(ctx, {
        application: this.application,
        organization: this.organization,
        username: email,
        password,
        type: "token",
      });

      if (loginResponse.data.status !== "ok") {
        return {
          success: false,
          user: null,
          token: null,
          error: loginResponse.data.msg || "Login failed",
        };
      }

      const accessToken = loginResponse.data.data as string;
      const refreshToken = (loginResponse.data.data2 as string) || "";

      const jwtUser = this.client.sdk.parseJwtToken(accessToken);
      const user = await this.findUserByEmail(jwtUser.email!);

      if (!user) {
        return {
          success: false,
          user: null,
          token: null,
          error: "User not found after authentication",
        };
      }

      return {
        success: true,
        user,
        token: {
          accessToken,
          refreshToken,
          expiresIn: 7200,
        },
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async signUp(
    input: UserCreateInput,
    ctx: RequestContext = {}
  ): Promise<SignUpResult> {
    const { email, password } = input;

    try {
      const signupResponse = await this.client.auth.signup(ctx, {
        application: this.application,
        organization: this.organization,
        email,
        password,
      });

      if (signupResponse.data.status !== "ok") {
        return {
          success: false,
          user: null,
          token: null,
          error: signupResponse.data.msg || "Signup failed",
        };
      }

      return this.signIn(input, ctx);
    } catch (error) {
      return {
        success: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async createOrganization(
    input: CreateOrganizationInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.sdk.addOrganization({
        owner: "admin",
        name: input.name,
        displayName: input.displayName,
        websiteUrl: "",
        favicon: "",
        passwordType: "plain",
        phonePrefix: "380",
        defaultAvatar: "",
        defaultApplication: this.application,
        tags: [],
        languages: ["uk", "en"],
        masterPassword: "",
        initScore: 0,
        enableSoftDeletion: false,
        isProfilePublic: false,
      });

      if (response.data?.status === "ok") {
        return { success: true };
      }

      return {
        success: false,
        error: response.data?.msg || "Failed to create organization",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
