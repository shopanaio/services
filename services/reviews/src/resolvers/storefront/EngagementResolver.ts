import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { ContentReport, ContentVote } from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";
import { customerReference } from "./references.js";
import { viewerKey } from "./ContentResolver.js";

@SubgraphReference()
export class ContentVoteResolver extends ReviewsType<string, ContentVote> {
  async $preload() { const row = await this.$ctx.loaders.contentVote.load(this.$props); if (!row || row.voterKey !== viewerKey(this.$ctx)) throw new PreloadNotFoundError("Content vote not found"); return row; }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentVote); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  async voterCustomer() { return customerReference(await this.$get("voterCustomerId")); }
  type() { return this.$get("type"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}
@SubgraphReference()
export class ContentReportResolver extends ReviewsType<string, ContentReport> {
  async $preload() { const row = await this.$ctx.loaders.contentReport.load(this.$props); if (!row || row.reporterKey !== viewerKey(this.$ctx)) throw new PreloadNotFoundError("Content report not found"); return row; }
  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentReport); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  async reporterCustomer() { return customerReference(await this.$get("reporterCustomerId")); }
  reason() { return this.$get("reason"); }
  details() { return this.$get("details"); }
  status() { return this.$get("status"); }
  resolvedAt() { return this.$get("resolvedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}
