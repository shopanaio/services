import type { ReviewContentCreateInput } from "../../resolvers/admin/generated/types.js";
import type { NewContentItem } from "../../repositories/models/index.js";
import type { UserError } from "../../kernel/BaseScript.js";

type ContentKind =
  | "REVIEW"
  | "REVIEW_REPLY"
  | "PRODUCT_QUESTION"
  | "QUESTION_ANSWER";
type ContentCreateValues = Omit<
  NewContentItem,
  | "id"
  | "storeId"
  | "kind"
  | "revision"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "redactedAt"
>;

export function mapContentCreate(
  input: ReviewContentCreateInput,
  kind: ContentKind,
  actorId?: string
): { values?: ContentCreateValues; errors: UserError[] } {
  const errors: UserError[] = [];
  const body = input.body.trim();
  const minimumBodyLength =
    kind === "REVIEW"
      ? 20
      : kind === "PRODUCT_QUESTION" || kind === "QUESTION_ANSWER"
        ? 10
        : 1;
  const title = input.title?.trim() || null;
  const locale = input.locale.trim();
  const displayName = input.author.displayName.trim();
  const sourceChannel = input.source?.channel?.trim() || "ADMIN";
  const metadata = input.source?.metadata ?? {};
  const status = input.status ?? "PENDING";
  const moderationNote = input.moderationNote?.trim() || null;

  if (body.length < minimumBodyLength || body.length > 5000) {
    errors.push({
      message: `Content body must contain between ${minimumBodyLength} and 5000 characters`,
      code: "INVALID_BODY",
      field: ["content", "body"],
    });
  }
  if (kind !== "REVIEW" && title !== null) {
    errors.push({
      message: "Only reviews may have a title",
      code: "INVALID_TITLE",
      field: ["content", "title"],
    });
  } else if (title !== null && title.length > 150) {
    errors.push({
      message: "Content title cannot exceed 150 characters",
      code: "INVALID_TITLE",
      field: ["content", "title"],
    });
  }
  if (locale.length === 0 || locale.length > 35) {
    errors.push({ message: "Locale must contain between 1 and 35 characters", code: "INVALID_LOCALE", field: ["content", "locale"] });
  }
  if (displayName.length === 0 || displayName.length > 150) {
    errors.push({ message: "Author display name must contain between 1 and 150 characters", code: "INVALID_AUTHOR", field: ["content", "author", "displayName"] });
  }
  if (input.author.type === "CUSTOMER" && !input.author.customerId) {
    errors.push({ message: "Customer authors require customerId", code: "INVALID_AUTHOR", field: ["content", "author", "customerId"] });
  }
  if (input.author.type === "GUEST" && !input.author.email) {
    errors.push({ message: "Guest authors require email", code: "INVALID_AUTHOR", field: ["content", "author", "email"] });
  }
  if (input.author.email && input.author.email.trim().length > 320) {
    errors.push({ message: "Author email cannot exceed 320 characters", code: "INVALID_AUTHOR", field: ["content", "author", "email"] });
  }
  if (!isRecord(metadata)) {
    errors.push({ message: "Source metadata must be an object", code: "INVALID_METADATA", field: ["content", "source", "metadata"] });
  }
  if (status === "REJECTED" && !moderationNote) {
    errors.push({ message: "Rejected content requires a moderation note", code: "INVALID_MODERATION_NOTE", field: ["content", "moderationNote"] });
  }
  if (sourceChannel.length > 64) {
    errors.push({ message: "Source channel cannot exceed 64 characters", code: "INVALID_SOURCE", field: ["content", "source", "channel"] });
  }
  if (moderationNote && moderationNote.length > 1000) {
    errors.push({ message: "Moderation note cannot exceed 1000 characters", code: "INVALID_MODERATION_NOTE", field: ["content", "moderationNote"] });
  }
  if (errors.length > 0) return { errors };

  const now = new Date().toISOString();
  return {
    values: {
      title,
      body,
      locale,
      authorType: input.author.type,
      authorCustomerId: input.author.customerId ?? null,
      authorPrincipalId: input.author.principalId?.trim() || null,
      authorDisplayName: displayName,
      authorEmail: input.author.email?.trim() || null,
      sourceChannel,
      sourceMetadata: metadata as Record<string, unknown>,
      idempotencyKey: input.source?.idempotencyKey?.trim() || null,
      status,
      moderationNote,
      moderatedByPrincipalId: status === "PENDING" ? null : actorId ?? null,
      moderatedAt: status === "PENDING" ? null : now,
      publishedAt: status === "PUBLISHED" ? now : null,
      unpublishedAt: null,
    },
    errors: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function internalError(): UserError[] {
  return [{ message: "Internal error", code: "INTERNAL_ERROR" }];
}
