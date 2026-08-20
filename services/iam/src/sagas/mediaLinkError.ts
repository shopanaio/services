import type { Media } from "@shopana/broker-types";
import type { UserError } from "@shopana/shared-kernel";

export function mediaLinkError(result: Media.FileLinkResult, field: string): UserError {
  switch (result.code) {
    case "FILE_NOT_FOUND":
      return {
        code: "MEDIA_FILE_NOT_FOUND",
        message: "Media file not found",
        field: [field],
      };
    case "FILE_INACTIVE":
      return {
        code: "MEDIA_FILE_INACTIVE",
        message: "Media file is not active",
        field: [field],
      };
    case "OWNER_MISMATCH":
      return {
        code: "MEDIA_FILE_FORBIDDEN",
        message: "Media file does not belong to this owner",
        field: [field],
      };
    case "LINK_FAILED":
    case "LINKED":
      return {
        code: "MEDIA_LINK_FAILED",
        message: "Unable to attach media file",
        field: [field],
      };
  }
}
