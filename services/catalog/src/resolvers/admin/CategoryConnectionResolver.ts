import type { CategoryRelayInput } from "../../repositories/category/CategoryRepository.js";
import { CategoryResolver } from "./CategoryResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type CategoryConnectionInput = CategoryRelayInput;

/**
 * CategoryConnection - resolves paginated category list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class CategoryConnectionResolver extends BaseConnectionResolver<CategoryRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.category.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new CategoryResolver(nodeId, this.$ctx);
  }
}
