import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./BaseConnectionResolver.js";
import { FileResolver } from "../FileResolver.js";
import type { FileRelayInput } from "../../../repositories/FileRepository.js";

/**
 * Connection resolver for files with Relay-style pagination.
 */
export class FileConnectionResolver extends BaseConnectionResolver<FileRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.file.getConnection(
      this.$ctx.store.id,
      this.$props
    );
  }

  protected createNodeResolver(nodeId: string) {
    return new FileResolver(nodeId, this.$ctx);
  }
}
