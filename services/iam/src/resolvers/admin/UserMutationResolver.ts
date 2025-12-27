import { IAMType } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import { UserUpdateProfileScript } from "../../scripts/user/UserUpdateProfileScript.js";
import { UserUpdateEmailScript } from "../../scripts/user/UserUpdateEmailScript.js";
import { UserUpdatePasswordScript } from "../../scripts/user/UserUpdatePasswordScript.js";

// Input types
interface UserUpdateProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  language?: string | null;
}

interface UserUpdateEmailInput {
  newEmail: string;
}

interface UserUpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * UserMutation namespace resolver.
 * Handles user profile, email, and password updates.
 */
export class UserMutationResolver extends IAMType<Record<string, never>> {
  /**
   * Update user's profile (firstName, lastName, language).
   */
  async userUpdateProfile(args: { input: UserUpdateProfileInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return {
        userId: null,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to update your profile",
            field: null,
          },
        ],
      };
    }

    const result = await kernel.runScript(UserUpdateProfileScript, {
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      language: input.language ?? undefined,
    });

    return {
      userId: result.userId ?? null,
      userErrors: result.userErrors.map((e) => ({
        code: e.code,
        message: e.message,
        field: e.field ?? null,
      })),
    };
  }

  /**
   * Update user's email address with verification.
   */
  async userUpdateEmail(args: { input: UserUpdateEmailInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.ctx;

    if (!currentUser?.id) {
      return {
        userId: null,
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
      userId: result.userId ?? null,
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
  async userUpdatePassword(args: { input: UserUpdatePasswordInput }) {
    const { input } = args;
    const { currentUser, kernel } = this.ctx;

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
}
