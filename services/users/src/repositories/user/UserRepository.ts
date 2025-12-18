import type { User, CasdoorNodeClient, RequestContext } from "@zaytra/casdoor-node-client-ext";

// Re-export User type from SDK
export type { User };

export interface UserCreateInput {
  email: string;
  password: string;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  locale?: string;
}

export interface SignUpResult {
  success: boolean;
  user: User | null;
  token: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null;
  error?: string;
}

/**
 * Repository for admin users
 */
export class UserRepository {
  constructor(
    private readonly client: CasdoorNodeClient,
    private readonly organization: string,
    private readonly application: string
  ) {}

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const response = await this.client.sdk.getUser(email);
    return response.data?.data ?? null;
  }

  /**
   * Find user by name (username)
   */
  async findByName(name: string): Promise<User | null> {
    const response = await this.client.sdk.getUser(name);
    return response.data?.data ?? null;
  }

  /**
   * Sign up a new user
   */
  async signUp(input: UserCreateInput, ctx: RequestContext = {}): Promise<SignUpResult> {
    const { email, password } = input;
    const username = email.split("@")[0] + "_" + Date.now();

    try {
      // 1. Create user via /api/signup
      const signupResponse = await this.client.auth.signup(ctx, {
        application: this.application,
        organization: this.organization,
        username,
        name: username,
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

      // 2. Login with type: "token" to get tokens
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
          error: loginResponse.data.msg || "Login after signup failed",
        };
      }

      const accessToken = loginResponse.data.data as string;
      const refreshToken = (loginResponse.data.data2 as string) || "";

      // 3. Parse user from token
      const user = this.client.sdk.parseJwtToken(accessToken);

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
}
