import type { FileUpload } from "graphql-upload-minimal";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { ProfileAvatarUploadScript } from "../../scripts/index.js";

/**
 * UserMutation resolver for federation extension.
 * Handles avatar upload for user profiles.
 */
export class UserMutationResolver extends MediaType<Record<string, never>> {
  /**
   * Upload avatar for the current user.
   * The file is stored in the user's asset group.
   */
  async avatarUpload({
    input,
  }: {
    input: {
      file: Promise<FileUpload>;
      altText?: string;
    };
  }) {
    const { kernel } = this.$ctx;

    // Get current user from context
    if (!this.$ctx.hasUser) {
      return {
        file: null,
        user: null,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to upload an avatar",
            field: null,
          },
        ],
      };
    }

    const userId = this.$ctx.user.id;

    const result = await kernel.runScript(ProfileAvatarUploadScript, {
      file: input.file,
      ownerType: "user_profile",
      ownerId: userId,
      altText: input.altText,
    });

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      user: result.file
        ? { id: encodeGlobalIdByType(userId, GlobalIdEntity.User) }
        : null,
      userErrors: result.userErrors,
    };
  }
}
