import { GlobalIdEntity, type GlobalIdType } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  ContentItem,
  ContentPublication,
  ContentTranslation,
} from "../../repositories/models/index.js";
import type { RelayPaginationInput } from "../../repositories/types.js";
import { ContentExternalReferenceConnectionResolver } from "./ContentConnectionResolver.js";
import { ContentReportConnectionResolver } from "./ContentConnectionResolver.js";
import { ContentRevisionConnectionResolver } from "./ContentConnectionResolver.js";
import { ContentVoteConnectionResolver } from "./ContentConnectionResolver.js";
import { ModerationCaseConnectionResolver } from "./ContentConnectionResolver.js";
import { ModerationEventConnectionResolver } from "./ContentConnectionResolver.js";
import { ModerationSignalConnectionResolver } from "./ContentConnectionResolver.js";
import { ReviewsType } from "./ReviewsType.js";
import { customerReference } from "./references.js";

const contentGlobalIdTypes: Record<ContentItem["kind"], GlobalIdType> = {
  REVIEW: GlobalIdEntity.Review,
  REVIEW_REPLY: GlobalIdEntity.ReviewReply,
  PRODUCT_QUESTION: GlobalIdEntity.ProductQuestion,
  QUESTION_ANSWER: GlobalIdEntity.ProductQuestionAnswer,
};

export abstract class ContentResolver<TData = unknown> extends ReviewsType<
  string,
  TData
> {
  protected async loadContent(): Promise<ContentItem> {
    const content = await this.$ctx.loaders.content.load(this.$props);
    if (!content) {
      throw new PreloadNotFoundError(
        `Review content with ID ${this.$props} not found`
      );
    }
    return content;
  }

  async id() {
    const content = await this.loadContent();
    return this.encodeId(this.$props, contentGlobalIdTypes[content.kind]);
  }

  async kind() { return (await this.loadContent()).kind; }
  async title() { return (await this.loadContent()).title; }
  async body() { return (await this.loadContent()).body; }
  async locale() { return (await this.loadContent()).locale; }
  async sourceChannel() { return (await this.loadContent()).sourceChannel; }
  async sourceMetadata() { return (await this.loadContent()).sourceMetadata; }
  async idempotencyKey() { return (await this.loadContent()).idempotencyKey; }
  async status() { return (await this.loadContent()).status; }
  async moderationNote() { return (await this.loadContent()).moderationNote; }
  async moderatedByPrincipalId() { return (await this.loadContent()).moderatedByPrincipalId; }
  async moderatedAt() { return (await this.loadContent()).moderatedAt; }
  async publishedAt() { return (await this.loadContent()).publishedAt; }
  async unpublishedAt() { return (await this.loadContent()).unpublishedAt; }
  async revision() { return (await this.loadContent()).revision; }
  async createdAt() { return (await this.loadContent()).createdAt; }
  async updatedAt() { return (await this.loadContent()).updatedAt; }
  async deletedAt() { return (await this.loadContent()).deletedAt; }
  async redactedAt() { return (await this.loadContent()).redactedAt; }

  async author() {
    return new ContentAuthorResolver(await this.loadContent(), this.$ctx);
  }

  async metrics() {
    const [metrics, content] = await Promise.all([
      this.$ctx.loaders.contentMetrics.load(this.$props),
      this.loadContent(),
    ]);
    return (
      metrics ?? {
        contentId: this.$props,
        storeId: content.storeId,
        likeCount: 0,
        dislikeCount: 0,
        reportCount: 0,
        openReportCount: 0,
        mediaCount: 0,
        childCount: 0,
        officialChildCount: 0,
        acceptedChildCount: 0,
        lastChildAt: null,
        updatedAt: content.updatedAt,
      }
    );
  }

  async translations() {
    const rows = await this.$ctx.loaders.contentTranslations.load(this.$props);
    for (const row of rows) this.$ctx.loaders.contentTranslation.prime(row.id, row);
    return rows.map((row) => new ContentTranslationResolver(row.id, this.$ctx));
  }

  async publications() {
    const rows = await this.$ctx.loaders.contentPublications.load(this.$props);
    for (const row of rows) this.$ctx.loaders.contentPublication.prime(row.id, row);
    return rows.map((row) => new ContentPublicationResolver(row.id, this.$ctx));
  }

  votes(args: RelayPaginationInput) {
    return new ContentVoteConnectionResolver(
      { ...args, contentId: this.$props },
      this.$ctx
    );
  }

  reports(args: RelayPaginationInput) {
    return new ContentReportConnectionResolver(
      { ...args, contentId: this.$props },
      this.$ctx
    );
  }

  moderationCases(args: RelayPaginationInput) {
    return new ModerationCaseConnectionResolver(
      { ...args, contentId: this.$props },
      this.$ctx
    );
  }

  moderationEvents(args: RelayPaginationInput) {
    return new ModerationEventConnectionResolver(
      { ...args, contentId: this.$props },
      this.$ctx
    );
  }

  revisions(args: RelayPaginationInput) {
    return new ContentRevisionConnectionResolver(
      { ...args, contentId: this.$props },
      this.$ctx
    );
  }

  moderationSignals(args: RelayPaginationInput) {
    return new ModerationSignalConnectionResolver(
      { ...args, contentId: this.$props },
      this.$ctx
    );
  }

  externalReferences(args: RelayPaginationInput) {
    return new ContentExternalReferenceConnectionResolver(
      { ...args, contentId: this.$props },
      this.$ctx
    );
  }
}

export class ContentAuthorResolver extends ReviewsType<ContentItem> {
  type() { return this.$props.authorType; }
  customer() { return customerReference(this.$props.authorCustomerId); }
  principalId() { return this.$props.authorPrincipalId; }
  displayName() { return this.$props.authorDisplayName; }
  email() { return this.$props.authorEmail; }
}

@SubgraphReference()
export class ContentTranslationResolver extends ReviewsType<
  string,
  ContentTranslation
> {
  async $preload() {
    const row = await this.$ctx.loaders.contentTranslation.load(this.$props);
    if (!row) {
      throw new PreloadNotFoundError(
        `Review content translation with ID ${this.$props} not found`
      );
    }
    return row;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentTranslation); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  locale() { return this.$get("locale"); }
  title() { return this.$get("title"); }
  body() { return this.$get("body"); }
  source() { return this.$get("source"); }
  status() { return this.$get("status"); }
  revision() { return this.$get("revision"); }
  reviewedByPrincipalId() { return this.$get("reviewedByPrincipalId"); }
  reviewedAt() { return this.$get("reviewedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

@SubgraphReference()
export class ContentPublicationResolver extends ReviewsType<
  string,
  ContentPublication
> {
  async $preload() {
    const row = await this.$ctx.loaders.contentPublication.load(this.$props);
    if (!row) {
      throw new PreloadNotFoundError(
        `Review content publication with ID ${this.$props} not found`
      );
    }
    return row;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentPublication); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  channel() { return this.$get("channel"); }
  locale() { return this.$get("locale"); }
  status() { return this.$get("status"); }
  scheduledAt() { return this.$get("scheduledAt"); }
  publishedAt() { return this.$get("publishedAt"); }
  unpublishedAt() { return this.$get("unpublishedAt"); }
  lastError() { return this.$get("lastError"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}
