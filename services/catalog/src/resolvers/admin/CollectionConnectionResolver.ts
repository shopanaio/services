import type { CollectionRelayInput } from "../../repositories/collection/CollectionRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type CollectionConnectionInput = CollectionRelayInput;

export class CollectionConnectionResolver extends BaseConnectionResolver<CollectionConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.getServices().repository.collection.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.collection(nodeId);
  }
}
