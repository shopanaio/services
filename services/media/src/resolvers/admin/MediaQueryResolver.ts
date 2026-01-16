import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { FileConnectionResolver } from "./connection/index.js";
import type { FileRelayInput } from "../../repositories/FileRepository.js";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";

/**
 * MediaQuery namespace resolver.
 * Handles all media query operations.
 */
export class MediaQueryResolver extends MediaType<Record<string, never>> {
  /**
   * Get a node by its global ID (Relay Node interface)
   */
  node({ id }: { id: string }) {
    const fileId = decodeGlobalIdByType(id, GlobalIdEntity.File);
    if (!fileId) {
      return null;
    }

    return new FileResolver(fileId, this.$ctx);
  }

  /**
   * Get multiple nodes by their global IDs (Relay Node interface)
   */
  nodes({ ids }: { ids: string[] }) {
    return ids.map((id) => {
      const fileId = decodeGlobalIdByType(id, GlobalIdEntity.File);
      if (!fileId) {
        return null;
      }

      return new FileResolver(fileId, this.$ctx);
    });
  }

  /**
   * Get a single file by ID
   */
  file({ groupId, id }: { groupId: string; id: string }) {
    // Decode groupId (MediaAssetGroup GID) to assetGroupId
    const assetGroupId = decodeGlobalIdByType(
      groupId,
      GlobalIdEntity.MediaAssetGroup
    );
    if (!assetGroupId) {
      return null;
    }

    // Decode fileId (File GID) to fileId
    const fileId = decodeGlobalIdByType(id, GlobalIdEntity.File);
    if (!fileId) {
      return null;
    }

    // TODO: authorize by group id

    return new FileResolver(fileId, this.$ctx);
  }

  /**
   * Get files with Relay-style pagination
   */
  files(args: FileRelayInput) {
    // Decode groupId (MediaAssetGroup GID) to assetGroupId
    const assetGroupId = decodeGlobalIdByType(
      args.groupId,
      GlobalIdEntity.MediaAssetGroup
    );
    if (!assetGroupId) {
      return null;
    }

    return new FileConnectionResolver(
      // Add decoded groupId to args
      { ...args, groupId: assetGroupId },
      this.$ctx
    );
  }
}
