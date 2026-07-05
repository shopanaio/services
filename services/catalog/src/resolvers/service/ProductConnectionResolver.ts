import type { ProductConnectionInput } from "../../repositories/product/ProductRepository.js";
import { ProductConnectionResolver } from "../admin/ProductConnectionResolver.js";
import { ProductSnapshotResolver } from "./ProductSnapshotResolver.js";

export class ServiceProductConnectionResolver extends ProductConnectionResolver {
  constructor(props: ProductConnectionInput, ctx: ConstructorParameters<typeof ProductConnectionResolver>[1]) {
    super(props, ctx);
  }

  protected override async createNodeResolver(nodeId: string) {
    return new ProductSnapshotResolver(nodeId, this.$ctx);
  }
}
