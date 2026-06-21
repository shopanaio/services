import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { BulkEditJob } from "../../repositories/models/index.js";
import type { BulkEditItemConnectionInput } from "../../repositories/BulkEditItemRepository.js";
import { CatalogType } from "./CatalogType.js";
import { BulkUpdateItemResolver } from "./BulkUpdateItemResolver.js";

export class ProductBulkUpdateJobResolver extends CatalogType<string, BulkEditJob> {
  async $preload() {
    const job = await this.$ctx.loaders.bulkEditJob.load(this.$props);
    if (!job) {
      throw new Error(`BulkEditJob with ID ${this.$props} not found`);
    }
    return job;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.ProductBulkUpdateJob);
  }

  async status() {
    return this.$get("status");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async startedAt() {
    return this.$get("startedAt");
  }

  async finishedAt() {
    return this.$get("finishedAt");
  }

  async totalProducts(): Promise<number> {
    return this.$ctx.loaders.bulkEditJobTotalProducts.load(this.$props);
  }

  async progress() {
    return this.$ctx.loaders.bulkEditJobProgress.load(this.$props);
  }

  async items(args: { first?: number; after?: string; statusFilter?: string[] }) {
    const input: BulkEditItemConnectionInput = {
      jobId: this.$props,
      first: args.first ?? undefined,
      after: args.after ?? undefined,
      statusFilter: args.statusFilter as BulkEditItemConnectionInput["statusFilter"],
    };

    const result = await this.$ctx.kernel.repository.bulkEditItem.getConnection(input);

    const edges = result.edges.map((edge) => ({
      cursor: edge.cursor,
      node: new BulkUpdateItemResolver(edge.nodeId, this.$ctx),
    }));

    return {
      edges,
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  }
}
