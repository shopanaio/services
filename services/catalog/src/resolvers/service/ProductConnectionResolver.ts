import type { ProductConnectionInput } from "../../repositories/product/ProductRepository.js";
import type { ConnectionData } from "../admin/connection/BaseConnectionResolver.js";
import { ProductSnapshotResolver } from "./ProductSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export class ServiceProductConnectionResolver extends ServiceType<
  ProductConnectionInput,
  ConnectionData
> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.product.getConnection(this.$props);
  }

  protected async createNodeResolver(nodeId: string) {
    return new ProductSnapshotResolver(nodeId, this.$ctx);
  }

  async edges() {
    const edgesData = await this.$get("edges");
    return Promise.all(
      (edgesData ?? []).map(async (edge) => ({
        cursor: edge.cursor,
        node: await this.createNodeResolver(edge.nodeId),
      }))
    );
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
