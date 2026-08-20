import type { ProductConnectionInput } from "../../repositories/product/ProductRepository.js";
import {
  BaseConnectionEdgeResolver,
  BaseConnectionResolver,
  type ConnectionData,
  type EdgeData,
} from "./connection/BaseConnectionResolver.js";
import type { ProductSnapshotResolver } from "./ProductSnapshotResolver.js";

class ServiceProductEdgeResolver extends BaseConnectionEdgeResolver<ProductSnapshotResolver> {
  node(): Promise<ProductSnapshotResolver> {
    return this.resolvers.productSnapshot(this.$props.nodeId);
  }
}

export class ServiceProductConnectionResolver extends BaseConnectionResolver<
  ProductConnectionInput,
  ServiceProductEdgeResolver
> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.getServices().repository.product.getConnection(this.$props);
  }

  protected createEdgeResolver(edge: EdgeData): ServiceProductEdgeResolver {
    return new ServiceProductEdgeResolver(edge, this.$ctx);
  }
}
