import { BaseScript, ZodSchema, Transactional, ValidationError } from "../../kernel/BaseScript.js";
import {
  userUpdateProfileParamsSchema,
  type UserUpdateProfileParams,
  type UserUpdateProfileResult,
} from "./dto/UserUpdateProfileDto.js";

/**
 * UserUpdateProfileScript - Update a validated user's profile
 *
 * Updates the user's firstName, lastName, and avatar.
 * The caller passes the user ID captured before entering the durable saga.
 */
export class UserUpdateProfileScript extends BaseScript<
  UserUpdateProfileParams,
  UserUpdateProfileResult
> {
  @Transactional()
  @ZodSchema(userUpdateProfileParamsSchema)
  protected async execute(params: UserUpdateProfileParams): Promise<UserUpdateProfileResult> {
    const { userId, firstName, lastName, language, image } = params;

    // Check if there's anything to update
    if (
      firstName === undefined &&
      lastName === undefined &&
      language === undefined &&
      image === undefined
    ) {
      return {
        userId,
        userErrors: [],
      };
    }

    // Build name from firstName and lastName if provided
    const updateData: {
      firstName?: string;
      lastName?: string;
      name?: string;
      image?: string | null;
    } = {};

    if (image !== undefined) {
      updateData.image = image;
    }

    if (firstName !== undefined) {
      updateData.firstName = firstName;
    }

    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }

    // Update the composite name field if either firstName or lastName changed
    if (firstName !== undefined || lastName !== undefined) {
      // Fetch current user to get existing values for name construction
      const currentUserData = await this.repository.user.findById(userId);
      if (!currentUserData) {
        return {
          userId: undefined,
          userErrors: [
            {
              code: "NOT_FOUND",
              message: "User not found",
              field: ["userId"],
            },
          ],
        };
      }

      const newFirstName = firstName ?? currentUserData.firstName ?? "";
      const newLastName = lastName ?? currentUserData.lastName ?? "";
      updateData.name = `${newFirstName} ${newLastName}`.trim() || currentUserData.name;
    }

    // Update the user profile
    const updated = await this.repository.user.updateProfile(userId, updateData);

    if (!updated) {
      return {
        userId: undefined,
        userErrors: [
          {
            code: "UPDATE_FAILED",
            message: "Failed to update profile",
            field: [],
          },
        ],
      };
    }

    return {
      userId: updated.id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): UserUpdateProfileResult {
    if (error instanceof ValidationError) {
      return {
        userId: undefined,
        userErrors: error.errors,
      };
    }

    this.logger.error({ error }, "UserUpdateProfileScript failed");

    return {
      userId: undefined,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          field: [],
        },
      ],
    };
  }
}
