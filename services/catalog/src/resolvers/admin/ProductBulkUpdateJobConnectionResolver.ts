import type { BulkEditJobConnectionInput } from "../../repositories/BulkEditJobRepository.js";
import { ProductBulkUpdateJobResolver } from "./ProductBulkUpdateJobResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type ProductBulkUpdateJobConnectionInput = BulkEditJobConnectionInput;

export class ProductBulkUpdateJobConnectionResolver extends BaseConnectionResolver<BulkEditJobConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.bulkEditJob.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new ProductBulkUpdateJobResolver(nodeId, this.$ctx);
  }
}
