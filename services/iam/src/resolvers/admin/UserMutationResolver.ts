import { ZodResolver } from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { IAMType } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import { UserUpdateProfileScript } from "../../scripts/user/UserUpdateProfileScript.js";
import { UserUpdateEmailScript } from "../../scripts/user/UserUpdateEmailScript.js";
import { UserUpdatePasswordScript } from "../../scripts/user/UserUpdatePasswordScript.js";
import type {
  UserUpdateProfileInput,
  UserUpdateEmailInput,
  UserUpdatePasswordInput,
  SessionRevokeInput,
} from "./generated/types.js";
import {
  UserUpdateProfileInputSchema,
  UserUpdateEmailInputSchema,
  UserUpdatePasswordInputSchema,
  SessionRevokeInputSchema,
} from "./generated/schemas.js";

/**
 * UserMutation namespace resolver.
 * Handles user profile, email, and password updates.
 */
export class UserMutationResolver extends IAMType<Record<string, never>> {
  /**
   * Update user's profile (firstName, lastName, language, avatar).
   */
  @ZodResolver(UserUpdateProfileInputSchema())
  async userUpdateProfile(args: { input: UserUpdateProfileInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.$ctx;

    if (!currentUser?.id) {
      return {
        user: null,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to update your profile",
            field: null,
          },
        ],
      };
    }

    // Update profile via script (firstName, lastName, locale)
    const result = await kernel.runScript(UserUpdateProfileScript, {
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      language: input.locale ?? undefined,
      ...(input.avatarId
        ? { imageId: decodeGlobalIdByType(input.avatarId, GlobalIdEntity.File) }
        : {}),
    });

    if (result.userErrors.length > 0) {
      return {
        user: result.userId ? new UserResolver(result.userId, this.$ctx) : null,
        userErrors: result.userErrors.map((e) => ({
          code: e.code,
          message: e.message,
          field: e.field ?? null,
        })),
      };
    }

    // Handle avatar update separately if provided
    if (input.avatarId !== undefined) {
      if (input.avatarId) {
      }
    }

    return {
      user: new UserResolver(currentUser.id, this.$ctx),
      userErrors: [],
    };
  }

  /**
   * Update user's email address with verification.
   */
  @ZodResolver(UserUpdateEmailInputSchema())
  async userUpdateEmail(args: { input: UserUpdateEmailInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.$ctx;

    if (!currentUser?.id) {
      return {
        user: null,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to update your email",
            field: null,
          },
        ],
      };
    }

    const result = await kernel.runScript(UserUpdateEmailScript, {
      newEmail: input.newEmail,
    });

    return {
      user: result.userId ? new UserResolver(result.userId, this.$ctx) : null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code,
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }

  /**
   * Update user's password (requires current password).
   */
  @ZodResolver(UserUpdatePasswordInputSchema())
  async userUpdatePassword(args: { input: UserUpdatePasswordInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.$ctx;

    if (!currentUser?.id) {
      return {
        success: false,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to update your password",
            field: null,
          },
        ],
      };
    }

    const result = await kernel.runScript(UserUpdatePasswordScript, {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return {
      success: result.success,
      userErrors: result.userErrors.map((e) => ({
        code: e.code,
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }

  /**
   * Revoke a specific session by ID.
   */
  @ZodResolver(SessionRevokeInputSchema())
  async sessionRevoke(args: { input: SessionRevokeInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.$ctx;

    if (!currentUser?.id) {
      return {
        success: false,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to revoke sessions",
            field: null,
          },
        ],
      };
    }

    // Decode the session ID from global ID
    const sessionId = decodeGlobalIdByType(
      input.sessionId,
      GlobalIdEntity.Session
    );

    // Prevent revoking current session
    if (currentUser.sessionId === sessionId) {
      return {
        success: false,
        userErrors: [
          {
            code: "INVALID_OPERATION",
            message: "Cannot revoke current session. Use sign out instead.",
            field: ["sessionId"],
          },
        ],
      };
    }

    // Verify the session belongs to the current user
    const sessions = await kernel.repository.user.getUserSessions(
      currentUser.id
    );
    const sessionBelongsToUser = sessions.some((s) => s.id === sessionId);

    if (!sessionBelongsToUser) {
      return {
        success: false,
        userErrors: [
          {
            code: "NOT_FOUND",
            message: "Session not found",
            field: ["sessionId"],
          },
        ],
      };
    }

    const success = await kernel.repository.user.revokeSession(sessionId);

    return {
      success,
      userErrors: success
        ? []
        : [
            {
              code: "REVOKE_FAILED",
              message: "Failed to revoke session",
              field: null,
            },
          ],
    };
  }

  /**
   * Revoke all sessions except the current one.
   */
  async sessionRevokeAll() {
    const { currentUser, kernel } = this.$ctx;

    if (!currentUser?.id) {
      return {
        revokedCount: 0,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to revoke sessions",
            field: null,
          },
        ],
      };
    }

    // Get all sessions to count them
    const sessions = await kernel.repository.user.getUserSessions(
      currentUser.id
    );

    // Filter out current session
    const sessionsToRevoke = sessions.filter(
      (s) => s.id !== currentUser.sessionId
    );

    if (sessionsToRevoke.length === 0) {
      return {
        revokedCount: 0,
        userErrors: [],
      };
    }

    // Revoke each session individually (to preserve current session)
    let revokedCount = 0;
    for (const session of sessionsToRevoke) {
      const success = await kernel.repository.user.revokeSession(session.id);
      if (success) {
        revokedCount++;
      }
    }

    return {
      revokedCount,
      userErrors: [],
    };
  }
}
