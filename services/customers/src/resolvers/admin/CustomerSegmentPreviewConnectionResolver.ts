import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerSegmentPreviewConnectionResolver extends BaseConnectionResolver<ConnectionData> {
  $preload(): Promise<ConnectionData> {
    return Promise.resolve(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.customer(nodeId);
  }
}
