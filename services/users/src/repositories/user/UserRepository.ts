import type {
  User,
  CasdoorNodeClient,
  RequestContext,
} from "@zaytra/casdoor-node-client-ext";

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
   * Get current user from JWT token
   * Returns user if token is valid, null otherwise
   */
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

      const user = await this.findByEmail(jwtUser.email);

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

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const response = await this.client.sdk.getUser(email);
    return response.data?.data ?? null;
  }

  /**
   * Sign in a user
   */
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

      // Parse JWT to get user email
      const jwtUser = this.client.sdk.parseJwtToken(accessToken);

      // Get full user object by email
      const user = await this.findByEmail(jwtUser.email!);

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

  /**
   * Sign up a new user
   */
  async signUp(
    input: UserCreateInput,
    ctx: RequestContext = {}
  ): Promise<SignUpResult> {
    const { email, password } = input;

    try {
      // 1. Create user via /api/signup
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

      // 2. Sign in to get tokens and full user object
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
}
