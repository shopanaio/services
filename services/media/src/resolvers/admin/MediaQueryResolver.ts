import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { FileConnectionResolver } from "./connection/index.js";
import { decodeGlobalId } from "./utils/globalId.js";
import type { FileRelayInput } from "../../repositories/FileRepository.js";

/**
 * MediaQuery namespace resolver.
 * Handles all media query operations.
 */
export class MediaQueryResolver extends MediaType<Record<string, never>> {
  /**
   * Get a node by its global ID (Relay Node interface)
   */
  node({ id }: { id: string }) {
    const decoded = decodeGlobalId(id);
    if (!decoded) {
      return null;
    }

    if (decoded.type === "File") {
      return new FileResolver(decoded.id, this.$ctx);
    }

    return null;
  }

  /**
   * Get multiple nodes by their global IDs (Relay Node interface)
   */
  nodes({ ids }: { ids: string[] }) {
    return ids.map((id) => {
      const decoded = decodeGlobalId(id);
      if (!decoded) {
        return null;
      }

      if (decoded.type === "File") {
        return new FileResolver(decoded.id, this.$ctx);
      }

      return null;
    });
  }

  /**
   * Get a single file by ID
   */
  file({ id }: { id: string }) {
    const decoded = decodeGlobalId(id);
    if (!decoded || decoded.type !== "File") {
      return null;
    }

    return new FileResolver(decoded.id, this.$ctx);
  }

  /**
   * Get files with Relay-style pagination
   */
  files(args: FileRelayInput) {

    return new FileConnectionResolver(args, this.$ctx);
  }
}
