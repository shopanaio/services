import type { FileUpload } from "graphql-upload-minimal";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { ProfileAvatarUploadScript } from "../../scripts/index.js";

/**
 * OrganizationMutation resolver for federation extension.
 * Handles logo upload for organizations.
 */
export class OrganizationMutationResolver extends MediaType<
  Record<string, never>
> {
  /**
   * Upload logo for an organization.
   * The file is stored in the organization's asset group.
   */
  async logoUpload({
    input,
  }: {
    input: {
      organizationId: string;
      file: Promise<FileUpload>;
      altText?: string;
    };
  }) {
    const { kernel } = this.$ctx;

    // Get current user from context
    if (!this.$ctx.hasUser) {
      return {
        file: null,
        organization: null,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "You must be logged in to upload a logo",
            field: null,
          },
        ],
      };
    }

    // Decode organization ID
    let organizationId: string;
    try {
      organizationId = decodeGlobalIdByType(
        input.organizationId,
        GlobalIdEntity.Organization
      );
    } catch {
      // If decoding fails, use the raw ID (might be a raw UUID)
      organizationId = input.organizationId;
    }

    const result = await kernel.runScript(ProfileAvatarUploadScript, {
      file: input.file,
      ownerType: "organization",
      ownerId: organizationId,
      altText: input.altText,
    });

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      organization: result.file
        ? {
            id: encodeGlobalIdByType(organizationId, GlobalIdEntity.Organization),
          }
        : null,
      userErrors: result.userErrors,
    };
  }
}
