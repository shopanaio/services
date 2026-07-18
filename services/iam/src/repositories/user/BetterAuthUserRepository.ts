import type { Auth } from "../../auth/auth.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtUserPayload {
  sub: string;
  email: string;
  name: string;
  [claim: string]: unknown;
}

export interface ParseJwtResult {
  success: boolean;
  payload: JwtUserPayload | null;
  error?: string;
}

export interface RequestHeaders {
  userAgent?: string;
  ipAddress?: string;
}

export interface UserCreateInput {
  email: string;
  password: string;
  name?: string;
  headers?: RequestHeaders;
}

export interface AuthTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignInResult<TUser extends AuthUser> {
  success: boolean;
  user: TUser | null;
  token: AuthTokenResult | null;
  error?: string;
}

export type SignUpResult<TUser extends AuthUser> = SignInResult<TUser>;

export interface GetCurrentUserResult<TUser extends AuthUser> {
  success: boolean;
  user: TUser | null;
  error?: string;
}

export interface RefreshTokenResult {
  success: boolean;
  token: AuthTokenResult | null;
  error?: string;
}

/**
 * Shared Better Auth flow for global and application-scoped users.
 *
 * Persistence isolation is owned by the injected Better Auth instance and its
 * adapter. Subclasses only provide direct user reads and JWT verification for
 * their corresponding tables and issuer.
 */
export abstract class BetterAuthUserRepository<TUser extends AuthUser> {
  protected constructor(protected readonly auth: Auth) {}

  abstract findById(userId: string): Promise<TUser | null>;

  abstract parseJwt(token: string): Promise<ParseJwtResult>;

  protected abstract mapAuthUser(user: unknown): TUser;

  async signIn(input: UserCreateInput): Promise<SignInResult<TUser>> {
    const { email, password, headers } = input;

    try {
      const result = await this.auth.api.signInEmail({
        body: { email, password },
        headers: buildAuthHeaders(headers),
      });

      if (!result.user || !result.token) {
        return {
          success: false,
          user: null,
          token: null,
          error: "Invalid credentials",
        };
      }

      const jwtResult = await this.auth.api.getToken({
        headers: { authorization: `Bearer ${result.token}` },
      });

      return {
        success: true,
        user: this.mapAuthUser(result.user),
        token: {
          accessToken: jwtResult.token,
          refreshToken: result.token,
          expiresIn: 60 * 15,
        },
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : "Sign in failed",
      };
    }
  }

  async signUp(input: UserCreateInput): Promise<SignUpResult<TUser>> {
    const { email, password, name, headers } = input;

    try {
      const result = await this.auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name || email.split("@")[0],
        },
        headers: buildAuthHeaders(headers),
      });

      if (!result.user) {
        return {
          success: false,
          user: null,
          token: null,
          error: "Sign up failed",
        };
      }

      let token: AuthTokenResult | null = null;
      if (result.token) {
        const jwtResult = await this.auth.api.getToken({
          headers: { authorization: `Bearer ${result.token}` },
        });

        token = {
          accessToken: jwtResult.token,
          refreshToken: result.token,
          expiresIn: 60 * 15,
        };
      }

      return {
        success: true,
        user: this.mapAuthUser(result.user),
        token,
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        token: null,
        error: error instanceof Error ? error.message : "Sign up failed",
      };
    }
  }

  async getCurrentUser(token: string): Promise<GetCurrentUserResult<TUser>> {
    const jwtResult = await this.verifyJwtToken(token);
    if (jwtResult.success) {
      return jwtResult;
    }

    try {
      const result = await this.auth.api.getSession({
        headers: { authorization: `Bearer ${token}` },
      });

      if (!result?.user) {
        return {
          success: false,
          user: null,
          error: "Invalid or expired session",
        };
      }

      return {
        success: true,
        user: this.mapAuthUser(result.user),
      };
    } catch (error) {
      return {
        success: false,
        user: null,
        error:
          error instanceof Error ? error.message : "Session validation failed",
      };
    }
  }

  async signOut(sessionToken: string): Promise<boolean> {
    try {
      await this.auth.api.signOut({
        headers: { authorization: `Bearer ${sessionToken}` },
      });
      return true;
    } catch {
      return false;
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    try {
      const sessionResult = await this.auth.api.getSession({
        headers: { authorization: `Bearer ${refreshToken}` },
      });

      if (!sessionResult?.session) {
        return {
          success: false,
          token: null,
          error: "Invalid or expired refresh token",
        };
      }

      const jwtResult = await this.auth.api.getToken({
        headers: { authorization: `Bearer ${refreshToken}` },
      });

      return {
        success: true,
        token: {
          accessToken: jwtResult.token,
          refreshToken,
          expiresIn: 60 * 15,
        },
      };
    } catch (error) {
      return {
        success: false,
        token: null,
        error: error instanceof Error ? error.message : "Token refresh failed",
      };
    }
  }

  private async verifyJwtToken(
    token: string
  ): Promise<GetCurrentUserResult<TUser>> {
    const parseResult = await this.parseJwt(token);
    if (!parseResult.success || !parseResult.payload?.sub) {
      return {
        success: false,
        user: null,
        error: parseResult.error,
      };
    }

    const user = await this.findById(parseResult.payload.sub);
    if (!user) {
      return { success: false, user: null, error: "User not found" };
    }

    return { success: true, user };
  }
}

function buildAuthHeaders(headers: RequestHeaders | undefined): Headers {
  const authHeaders = new Headers();
  if (headers?.userAgent) {
    authHeaders.set("user-agent", headers.userAgent);
  }
  if (headers?.ipAddress) {
    authHeaders.set("x-forwarded-for", headers.ipAddress);
  }
  return authHeaders;
}
