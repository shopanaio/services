import type { FileUpload } from "graphql-upload-minimal";
import { z } from "zod";
import type { FileResultBase } from "./shared.js";
import { ASSET_OWNER_TYPES, type AssetOwnerType } from "../../../repositories/models/index.js";

export const profileAvatarUploadSchema = z.object({
  file: z.any(),
  ownerType: z.enum(ASSET_OWNER_TYPES),
  ownerId: z.string().trim().min(1, "ownerId is required"),
});

export interface ProfileAvatarUploadParams {
  file: Promise<FileUpload>;
  ownerType: AssetOwnerType;
  ownerId: string;
}

export interface ProfileAvatarUploadResult extends FileResultBase {
  file: { id: string } | null;
}
