import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { FileConnectionResolver } from "./connection/index.js";
import type { FileRelayInput } from "../../repositories/FileRepository.js";
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";

/**
 * MediaQuery namespace resolver.
 * Handles all media query operations.
 * Store context is determined from x-store-name header.
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
  file({ id }: { id: string }) {
    // Decode fileId (File GID) to fileId
    const fileId = decodeGlobalIdByType(id, GlobalIdEntity.File);
    if (!fileId) {
      return null;
    }

    return new FileResolver(fileId, this.$ctx);
  }

  /**
   * Get files with Relay-style pagination.
   * Uses store.id from context as ownerId.
   */
  files(args: Omit<FileRelayInput, "ownerId">) {
    // Get store ID from context (determined by x-store-name header)
    const ownerId = this.$ctx.store.id;

    return new FileConnectionResolver(
      {
        ...args,
        ownerId,
      },
      this.$ctx
    );
  }
}
