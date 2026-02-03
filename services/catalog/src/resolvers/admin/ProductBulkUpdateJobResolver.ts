import type { BulkEditJob } from "../../repositories/models/index.js";
import type { BulkEditItemConnectionInput } from "../../repositories/BulkEditItemRepository.js";
import { CatalogType } from "./CatalogType.js";
import { BulkUpdateItemResolver } from "./BulkUpdateItemResolver.js";

export class ProductBulkUpdateJobResolver extends CatalogType<string, BulkEditJob> {
  async $preload() {
    const job = await this.$ctx.kernel.repository.bulkEditJob.findById(this.$props);
    if (!job) {
      throw new Error(`BulkEditJob with ID ${this.$props} not found`);
    }
    return job;
  }

  id() {
    return this.$props;
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
    return this.$ctx.kernel.repository.bulkEditItem.countDistinctProducts(this.$props);
  }

  async progress() {
    const counts = await this.$ctx.kernel.repository.bulkEditItem.countByStatus(this.$props);
    const getCount = (status: string) => counts[status] ?? 0;

    const succeeded = getCount("SUCCEEDED");
    const failed = getCount("FAILED");
    const cancelled = getCount("CANCELLED");
    const superseded = getCount("SUPERSEDED");
    const running = getCount("RUNNING");
    const pending = getCount("PENDING");
    const total = succeeded + failed + cancelled + superseded + running + pending;

    return {
      total,
      done: succeeded + failed + cancelled + superseded,
      succeeded,
      failed,
      cancelled,
      superseded,
      running,
      pending,
    };
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
