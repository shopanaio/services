import type { ProductConnectionInput } from "../../repositories/product/ProductRepository.js";
import {
  BaseConnectionEdgeResolver,
  BaseConnectionResolver,
  type ConnectionData,
  type EdgeData,
} from "./connection/BaseConnectionResolver.js";
import { ProductSnapshotResolver } from "./ProductSnapshotResolver.js";

class ServiceProductEdgeResolver extends BaseConnectionEdgeResolver<ProductSnapshotResolver> {
  node(): ProductSnapshotResolver {
    return new ProductSnapshotResolver(this.$props.nodeId, this.$ctx);
  }
}

export class ServiceProductConnectionResolver extends BaseConnectionResolver<
  ProductConnectionInput,
  ServiceProductEdgeResolver
> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.product.getConnection(this.$props);
  }

  protected createEdgeResolver(edge: EdgeData): ServiceProductEdgeResolver {
    return new ServiceProductEdgeResolver(edge, this.$ctx);
  }
}
