import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { ContentReport, ContentVote } from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";
import { customerReference } from "./references.js";

@SubgraphReference()
export class ContentVoteResolver extends ReviewsType<string, ContentVote> {
  async $preload() {
    const vote = await this.$ctx.loaders.contentVote.load(this.$props);
    if (!vote) {
      throw new PreloadNotFoundError(
        `Review content vote with ID ${this.$props} not found`
      );
    }
    return vote;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentVote); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  async voterCustomer() { return customerReference(await this.$get("voterCustomerId")); }
  type() { return this.$get("type"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

@SubgraphReference()
export class ContentReportResolver extends ReviewsType<string, ContentReport> {
  async $preload() {
    const report = await this.$ctx.loaders.contentReport.load(this.$props);
    if (!report) {
      throw new PreloadNotFoundError(
        `Review content report with ID ${this.$props} not found`
      );
    }
    return report;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentReport); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  async reporterCustomer() { return customerReference(await this.$get("reporterCustomerId")); }
  reason() { return this.$get("reason"); }
  details() { return this.$get("details"); }
  status() { return this.$get("status"); }
  assignedToPrincipalId() { return this.$get("assignedToPrincipalId"); }
  resolutionNote() { return this.$get("resolutionNote"); }
  resolvedByPrincipalId() { return this.$get("resolvedByPrincipalId"); }
  resolvedAt() { return this.$get("resolvedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}
