import { ZodResolver } from "@shopana/type-resolver";
import { IAMType } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import { UserSignUpScript } from "../../scripts/user/UserSignUpScript.js";
import { UserSignInScript } from "../../scripts/user/UserSignInScript.js";
import { TokenRefreshScript } from "../../scripts/user/TokenRefreshScript.js";
import type {
  UserSignUpInput,
  UserSignInInput,
  UserSignOutInput,
  UserTokenRefreshInput,
} from "./generated/types.js";
import {
  UserSignUpInputSchema,
  UserSignInInputSchema,
  UserSignOutInputSchema,
  UserTokenRefreshInputSchema,
} from "./generated/schemas.js";

/**
 * AuthMutation namespace resolver.
 * Handles authentication operations: signUp, signIn, signOut, tokenRefresh.
 */
export class AuthMutationResolver extends IAMType<Record<string, never>> {
  /**
   * Register a new user account.
   */
  @ZodResolver(UserSignUpInputSchema())
  async signUp(args: { input: UserSignUpInput }) {
    const { input } = args;
    const result = await this.$ctx.kernel.runScript(UserSignUpScript, {
      email: input.email,
      password: input.password,
      headers: this.$ctx.requestHeaders,
    });

    return {
      user: result.user ? new UserResolver(result.user.id, this.$ctx) : null,
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
  @ZodResolver(UserSignInInputSchema())
  async signIn(args: { input: UserSignInInput }) {
    const { input } = args;
    const result = await this.$ctx.kernel.runScript(UserSignInScript, {
      email: input.email,
      password: input.password,
      headers: this.$ctx.requestHeaders,
    });

    return {
      user: result.user ? new UserResolver(result.user.id, this.$ctx) : null,
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
  @ZodResolver(UserSignOutInputSchema())
  async signOut(args: { input: UserSignOutInput }) {
    const { input } = args;
    const currentUser = this.$ctx.currentUser;

    if (!currentUser?.id) {
      return {
        success: false,
        userErrors: [
          {
            code: "UNAUTHENTICATED",
            message: "You must be logged in to sign out",
            field: null,
          },
        ],
      };
    }

    try {
      if (input.allSessions) {
        // Revoke all sessions for the user
        await this.$ctx.kernel.repository.user.revokeAllSessions(currentUser.id);
      } else if (currentUser.sessionId) {
        // Revoke only current session
        await this.$ctx.kernel.repository.user.revokeSession(currentUser.sessionId);
      }

      return {
        success: true,
        userErrors: [],
      };
    } catch {
      return {
        success: false,
        userErrors: [
          {
            code: "SIGNOUT_FAILED",
            message: "Failed to sign out",
            field: null,
          },
        ],
      };
    }
  }

  /**
   * Refresh access token using refresh token.
   */
  @ZodResolver(UserTokenRefreshInputSchema())
  async tokenRefresh(args: { input: UserTokenRefreshInput }) {
    const { input } = args;
    const result = await this.$ctx.kernel.runScript(TokenRefreshScript, {
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
