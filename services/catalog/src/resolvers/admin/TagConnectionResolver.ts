import type { TagRelayInput } from "../../repositories/tag/TagRepository.js";
import { TagResolver } from "./TagResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type TagConnectionInput = TagRelayInput;

/**
 * TagConnection - resolves paginated tag list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class TagConnectionResolver extends BaseConnectionResolver<TagConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.tag.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new TagResolver(nodeId, this.$ctx);
  }
}
