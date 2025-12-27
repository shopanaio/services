import { IAMType } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import { UserSignUpScript } from "../../scripts/user/UserSignUpScript.js";
import { UserSignInScript } from "../../scripts/user/UserSignInScript.js";
import { TokenRefreshScript } from "../../scripts/user/TokenRefreshScript.js";

// Input types
interface SignUpInput {
  email: string;
  password: string;
}

interface SignInInput {
  email: string;
  password: string;
}

interface SignOutInput {
  refreshToken?: string | null;
}

interface TokenRefreshInput {
  refreshToken: string;
}

/**
 * AuthMutation namespace resolver.
 * Handles authentication operations: signUp, signIn, signOut, tokenRefresh.
 */
export class AuthMutationResolver extends IAMType<Record<string, never>> {
  /**
   * Register a new user account.
   */
  async signUp(args: { input: SignUpInput }) {
    const { input } = args;
    const result = await this.ctx.kernel.runScript(UserSignUpScript, {
      email: input.email,
      password: input.password,
    });

    return {
      user: result.user ? new UserResolver(result.user.id, this.ctx) : null,
      token: result.token,
      userErrors: result.userErrors.map((e) => ({
        code: e.code,
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }

  /**
   * Authenticate user with email and password.
   */
  async signIn(args: { input: SignInInput }) {
    const { input } = args;
    const result = await this.ctx.kernel.runScript(UserSignInScript, {
      email: input.email,
      password: input.password,
    });

    return {
      user: result.user ? new UserResolver(result.user.id, this.ctx) : null,
      token: result.token,
      userErrors: result.userErrors.map((e) => ({
        code: e.code,
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }

  /**
   * Sign out user and invalidate session/refresh token.
   */
  async signOut(_args: { input: SignOutInput }) {
    // TODO: Implement session invalidation
    return {
      success: false,
      userErrors: [
        {
          code: "NOT_IMPLEMENTED",
          message: "Sign out is not implemented yet",
          field: null,
        },
      ],
    };
  }

  /**
   * Refresh access token using refresh token.
   */
  async tokenRefresh(args: { input: TokenRefreshInput }) {
    const { input } = args;
    const result = await this.ctx.kernel.runScript(TokenRefreshScript, {
      refreshToken: input.refreshToken,
    });

    return {
      token: result.token,
      userErrors: result.userErrors.map((e) => ({
        code: e.code,
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }
}
