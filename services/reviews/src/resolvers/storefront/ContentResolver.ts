import { GlobalIdEntity, type GlobalIdType } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  ContentItem,
  ContentPublication,
  ContentTranslation,
} from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";
import { customerReference } from "./references.js";

const contentTypes: Record<ContentItem["kind"], GlobalIdType> = {
  REVIEW: GlobalIdEntity.Review,
  REVIEW_REPLY: GlobalIdEntity.ReviewReply,
  PRODUCT_QUESTION: GlobalIdEntity.ProductQuestion,
  QUESTION_ANSWER: GlobalIdEntity.ProductQuestionAnswer,
};

export function viewerKey(ctx: { customer?: { id: string } | null; visitorId?: string }) {
  if (ctx.customer) return `customer:${ctx.customer.id}`;
  if (!ctx.visitorId) throw new Error("Verified storefront visitor identity is required");
  return `visitor:${ctx.visitorId}`;
}

export function isContentVisible(content: ContentItem, customerId?: string | null) {
  return (
    content.deletedAt === null &&
    content.redactedAt === null &&
    (content.status === "PUBLISHED" || (!!customerId && content.authorCustomerId === customerId))
  );
}

export abstract class ContentResolver<TData = unknown> extends ReviewsType<string, TData> {
  protected async loadContent() {
    const content = await this.$ctx.loaders.content.load(this.$props);
    if (!content || !isContentVisible(content, this.$ctx.customer?.id)) {
      throw new PreloadNotFoundError(`Storefront review content ${this.$props} was not found`);
    }
    return content;
  }
  async id() {
    const row = await this.loadContent();
    return this.encodeId(this.$props, contentTypes[row.kind]);
  }
  async kind() {
    return (await this.loadContent()).kind;
  }
  async title() {
    return (await this.loadContent()).title;
  }
  async body() {
    return (await this.loadContent()).body;
  }
  async locale() {
    return (await this.loadContent()).locale;
  }
  async status() {
    return (await this.loadContent()).status;
  }
  async revision() {
    return (await this.loadContent()).revision;
  }
  async publishedAt() {
    return (await this.loadContent()).publishedAt;
  }
  async createdAt() {
    return (await this.loadContent()).createdAt;
  }
  async updatedAt() {
    return (await this.loadContent()).updatedAt;
  }
  async author() {
    return new ContentAuthorResolver(await this.loadContent(), this.$ctx);
  }
  async metrics() {
    const [row, content] = await Promise.all([
      this.$ctx.loaders.contentMetrics.load(this.$props),
      this.loadContent(),
    ]);
    return {
      likeCount: row?.likeCount ?? 0,
      dislikeCount: row?.dislikeCount ?? 0,
      mediaCount: row?.mediaCount ?? 0,
      childCount: row?.childCount ?? 0,
      officialChildCount: row?.officialChildCount ?? 0,
      acceptedChildCount: row?.acceptedChildCount ?? 0,
      lastChildAt: row?.lastChildAt ?? null,
      updatedAt: row?.updatedAt ?? content.updatedAt,
    };
  }
  async translations() {
    const rows = await this.$ctx.loaders.contentTranslations.load(this.$props);
    return rows
      .filter((row) => row.status === "PUBLISHED")
      .map((row) => {
        this.$ctx.loaders.contentTranslation.prime(row.id, row);
        return new ContentTranslationResolver(row.id, this.$ctx);
      });
  }
  async viewerEngagement() {
    const key = viewerKey(this.$ctx);
    const [vote, report] = await Promise.all([
      this.$ctx.kernel.repository.engagement.findVoteByViewer(this.$props, key),
      this.$ctx.kernel.repository.engagement.findActiveReportByViewer(this.$props, key),
    ]);
    return { vote: vote?.type ?? null, hasReported: !!report };
  }
  async viewerCapabilities() {
    const content = await this.loadContent();
    const customerId = this.$ctx.customer?.id;
    const owned = !!customerId && content.authorCustomerId === customerId;
    const configuration = await this.$ctx.kernel.repository.configuration.findStoreConfiguration();
    const hours =
      content.kind === "REVIEW"
        ? (configuration?.reviewEditWindowHours ?? 0)
        : content.kind === "PRODUCT_QUESTION"
          ? (configuration?.questionEditWindowHours ?? 0)
          : (configuration?.answerEditWindowHours ?? 0);
    const editableUntil = owned
      ? new Date(new Date(content.createdAt).getTime() + hours * 3_600_000).toISOString()
      : null;
    const editable = owned && !!editableUntil && Date.now() <= Date.parse(editableUntil);
    return { canUpdate: editable, canDelete: editable, editableUntil };
  }
}

export class ContentAuthorResolver extends ReviewsType<ContentItem> {
  type() {
    return this.$props.authorType;
  }
  customer() {
    return customerReference(this.$props.authorCustomerId);
  }
  displayName() {
    return this.$props.authorDisplayName;
  }
}

@SubgraphReference()
export class ContentTranslationResolver extends ReviewsType<string, ContentTranslation> {
  async $preload() {
    const row = await this.$ctx.loaders.contentTranslation.load(this.$props);
    if (!row || row.status !== "PUBLISHED")
      throw new PreloadNotFoundError("Published translation not found");
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewContentTranslation);
  }
  async content() {
    return this.resolvers.content(await this.$get("contentId"));
  }
  locale() {
    return this.$get("locale");
  }
  title() {
    return this.$get("title");
  }
  body() {
    return this.$get("body");
  }
  source() {
    return this.$get("source");
  }
  status() {
    return this.$get("status");
  }
  revision() {
    return this.$get("revision");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}

@SubgraphReference()
export class ContentPublicationResolver extends ReviewsType<string, ContentPublication> {
  async $preload() {
    const row = await this.$ctx.loaders.contentPublication.load(this.$props);
    if (!row) throw new PreloadNotFoundError("Content publication not found");
    const content = await this.$ctx.loaders.content.load(row.contentId);
    if (!content || content.authorCustomerId !== this.$ctx.customer?.id)
      throw new PreloadNotFoundError("Content publication not found");
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ReviewContentPublication);
  }
  async content() {
    return this.resolvers.content(await this.$get("contentId"));
  }
  channel() {
    return this.$get("channel");
  }
  locale() {
    return this.$get("locale");
  }
  status() {
    return this.$get("status");
  }
  scheduledAt() {
    return this.$get("scheduledAt");
  }
  publishedAt() {
    return this.$get("publishedAt");
  }
  unpublishedAt() {
    return this.$get("unpublishedAt");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}
