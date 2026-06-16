import type { FileUpload } from "graphql-upload-minimal";
import type { FileResultBase } from "./shared.js";
import type { AssetOwnerType } from "../../../repositories/models/index.js";

export interface ProfileAvatarUploadParams {
  file: Promise<FileUpload>;
  ownerType: AssetOwnerType;
  ownerId: string;
}

export interface ProfileAvatarUploadResult extends FileResultBase {
  file: { id: string } | null;
}
