import type { UserError } from "../../kernel/BaseScript.js";
import type {
  ContentItem,
  NewContentPublication,
  NewContentTranslation,
} from "../../repositories/models/index.js";
import type { ContentPatch } from "../../repositories/content/ContentRepository.js";
import type {
  ReviewContentAuthorUpdateInput,
  ReviewContentModerationInput,
  ReviewContentPublicationSyncInput,
  ReviewContentSourceUpdateInput,
  ReviewContentTextUpdateInput,
  ReviewContentTranslationSyncInput,
  ReviewContentUpdateInput,
} from "../../resolvers/admin/generated/types.js";

type ContentKind =
  | "REVIEW"
  | "REVIEW_REPLY"
  | "PRODUCT_QUESTION"
  | "QUESTION_ANSWER";

export interface ContentPatchMappingResult {
  patch: ContentPatch;
  errors: UserError[];
}

export interface ContentCollectionMappingResult<T> {
  items: T[];
  errors: UserError[];
}

export interface NestedContentUpdateMappingResult {
  patch: ContentPatch;
  translations?: Array<
    Omit<
      NewContentTranslation,
      "id" | "storeId" | "contentId" | "revision" | "createdAt" | "updatedAt"
    >
  >;
  publications?: Array<
    Omit<
      NewContentPublication,
      "id" | "storeId" | "contentId" | "createdAt" | "updatedAt"
    >
  >;
  errors: UserError[];
}

export function mapContentTextUpdate(
  current: ContentItem,
  input: ReviewContentTextUpdateInput,
  kind: ContentKind,
  fieldPrefix: string[] = []
): ContentPatchMappingResult {
  const patch: ContentPatch = {};
  const errors: UserError[] = [];

  if (hasOwn(input, "title")) {
    const title = input.title?.trim() || null;
    if (kind !== "REVIEW" && title !== null) {
      errors.push({
        message: "Only reviews may have a title",
        code: "INVALID_TITLE",
        field: [...fieldPrefix, "title"],
      });
    } else if (title !== null && title.length > 150) {
      errors.push({
        message: "Title cannot exceed 150 characters",
        code: "INVALID_TITLE",
        field: [...fieldPrefix, "title"],
      });
    } else {
      patch.title = title;
    }
  }

  if (hasOwn(input, "body")) {
    const body = input.body?.trim();
    const minimumLength = minimumBodyLength(kind);
    if (body === undefined || body.length < minimumLength || body.length > 5000) {
      errors.push({
        message: `Content body must contain between ${minimumLength} and 5000 characters`,
        code: "INVALID_BODY",
        field: [...fieldPrefix, "body"],
      });
    } else {
      patch.body = body;
    }
  }

  if (hasOwn(input, "locale")) {
    const locale = input.locale?.trim();
    if (!locale || locale.length > 35) {
      errors.push({
        message: "Locale must contain between 1 and 35 characters",
        code: "INVALID_LOCALE",
        field: [...fieldPrefix, "locale"],
      });
    } else {
      patch.locale = locale;
    }
  }

  return { patch: changedPatch(current, patch), errors };
}

export function mapContentAuthorUpdate(
  current: ContentItem,
  input: ReviewContentAuthorUpdateInput,
  fieldPrefix: string[] = []
): ContentPatchMappingResult {
  const patch: ContentPatch = {};
  const errors: UserError[] = [];

  if (hasOwn(input, "type")) {
    if (input.type == null) {
      errors.push({
        message: "Author type cannot be null",
        code: "INVALID_AUTHOR",
        field: [...fieldPrefix, "type"],
      });
    } else {
      patch.authorType = input.type;
    }
  }
  if (hasOwn(input, "customerId")) {
    patch.authorCustomerId = input.customerId ?? null;
  }
  if (hasOwn(input, "principalId")) {
    patch.authorPrincipalId = input.principalId?.trim() || null;
  }
  if (hasOwn(input, "displayName")) {
    const displayName = input.displayName?.trim();
    if (!displayName) {
      errors.push({
        message: "Author display name cannot be empty",
        code: "INVALID_AUTHOR",
        field: [...fieldPrefix, "displayName"],
      });
    } else if (displayName.length > 150) {
      errors.push({
        message: "Author display name cannot exceed 150 characters",
        code: "INVALID_AUTHOR",
        field: [...fieldPrefix, "displayName"],
      });
    } else {
      patch.authorDisplayName = displayName;
    }
  }
  if (hasOwn(input, "email")) {
    const email = input.email?.trim() || null;
    if (email && email.length > 320) {
      errors.push({
        message: "Author email cannot exceed 320 characters",
        code: "INVALID_AUTHOR",
        field: [...fieldPrefix, "email"],
      });
    } else {
      patch.authorEmail = email;
    }
  }

  const resultingType = patch.authorType ?? current.authorType;
  const resultingCustomerId = hasOwn(patch, "authorCustomerId")
    ? patch.authorCustomerId
    : current.authorCustomerId;
  const resultingEmail = hasOwn(patch, "authorEmail")
    ? patch.authorEmail
    : current.authorEmail;
  if (resultingType === "CUSTOMER" && !resultingCustomerId) {
    errors.push({
      message: "Customer authors require customerId",
      code: "INVALID_AUTHOR",
      field: [...fieldPrefix, "customerId"],
    });
  }
  if (resultingType === "GUEST" && !resultingEmail) {
    errors.push({
      message: "Guest authors require email",
      code: "INVALID_AUTHOR",
      field: [...fieldPrefix, "email"],
    });
  }

  return { patch: changedPatch(current, patch), errors };
}

export function mapContentSourceUpdate(
  current: ContentItem,
  input: ReviewContentSourceUpdateInput,
  fieldPrefix: string[] = []
): ContentPatchMappingResult {
  const patch: ContentPatch = {};
  const errors: UserError[] = [];

  if (hasOwn(input, "channel")) {
    const channel = input.channel?.trim();
    if (!channel || channel.length > 64) {
      errors.push({
        message: "Source channel must contain between 1 and 64 characters",
        code: "INVALID_SOURCE",
        field: [...fieldPrefix, "channel"],
      });
    } else {
      patch.sourceChannel = channel;
    }
  }
  if (hasOwn(input, "metadata")) {
    if (input.metadata == null) {
      patch.sourceMetadata = {};
    } else if (!isRecord(input.metadata)) {
      errors.push({
        message: "Source metadata must be an object",
        code: "INVALID_METADATA",
        field: [...fieldPrefix, "metadata"],
      });
    } else {
      patch.sourceMetadata = input.metadata;
    }
  }
  if (hasOwn(input, "idempotencyKey")) {
    patch.idempotencyKey = input.idempotencyKey?.trim() || null;
  }

  return { patch: changedPatch(current, patch), errors };
}

export function mapContentModerationUpdate(
  current: ContentItem,
  input: ReviewContentModerationInput,
  actorId?: string,
  fieldPrefix: string[] = []
): ContentPatchMappingResult {
  const moderationNote = input.moderationNote?.trim() || null;
  const errors: UserError[] = [];
  if (moderationNote && moderationNote.length > 1000) {
    errors.push({
      message: "Moderation note cannot exceed 1000 characters",
      code: "INVALID_MODERATION_NOTE",
      field: [...fieldPrefix, "moderationNote"],
    });
  }
  if (input.status === "REJECTED" && !moderationNote) {
    errors.push({
      message: "Rejected content requires a moderation note",
      code: "INVALID_MODERATION_NOTE",
      field: [...fieldPrefix, "moderationNote"],
    });
  }
  if (
    input.status === current.status &&
    moderationNote === current.moderationNote
  ) {
    return { patch: {}, errors };
  }

  const now = new Date().toISOString();
  const patch: ContentPatch = {
    status: input.status,
    moderationNote,
    moderatedByPrincipalId: input.status === "PENDING" ? null : actorId ?? null,
    moderatedAt: input.status === "PENDING" ? null : now,
  };
  if (input.status === "PUBLISHED") {
    patch.publishedAt = current.publishedAt ?? now;
    patch.unpublishedAt = null;
  } else if (current.status === "PUBLISHED") {
    patch.unpublishedAt = now;
  }
  return { patch, errors };
}

export function mapContentTranslations(
  inputs: readonly ReviewContentTranslationSyncInput[],
  kind: ContentKind,
  actorId?: string,
  fieldPrefix: string[] = []
): ContentCollectionMappingResult<
  Omit<
    NewContentTranslation,
    "id" | "storeId" | "contentId" | "revision" | "createdAt" | "updatedAt"
  >
> {
  const errors: UserError[] = [];
  const locales = new Set<string>();
  const items = inputs.map((input, index) => {
    const itemPrefix = [...fieldPrefix, String(index)];
    const locale = input.locale.trim();
    const title = input.title?.trim() || null;
    const body = input.body.trim();
    const status = (input.status ?? "PENDING") as NonNullable<
      NewContentTranslation["status"]
    >;
    if (!locale || locale.length > 35) {
      errors.push({ message: "Locale must contain between 1 and 35 characters", code: "INVALID_LOCALE", field: [...itemPrefix, "locale"] });
    } else if (locales.has(locale)) {
      errors.push({ message: "Translation locale must be unique", code: "DUPLICATE_LOCALE", field: [...itemPrefix, "locale"] });
    }
    locales.add(locale);
    if (kind !== "REVIEW" && title !== null) {
      errors.push({ message: "Only reviews may have a title", code: "INVALID_TITLE", field: [...itemPrefix, "title"] });
    } else if (title !== null && title.length > 150) {
      errors.push({ message: "Title cannot exceed 150 characters", code: "INVALID_TITLE", field: [...itemPrefix, "title"] });
    }
    const minimumLength = minimumBodyLength(kind);
    if (body.length < minimumLength || body.length > 5000) {
      errors.push({
        message: `Content body must contain between ${minimumLength} and 5000 characters`,
        code: "INVALID_BODY",
        field: [...itemPrefix, "body"],
      });
    }
    const reviewed = status !== "PENDING";
    if (reviewed && !actorId) {
      errors.push({
        message: "Reviewed translations require an authenticated actor",
        code: "ACTOR_REQUIRED",
        field: [...itemPrefix, "status"],
      });
    }
    return {
      locale,
      title,
      body,
      source: input.source,
      status,
      reviewedByPrincipalId: reviewed ? actorId ?? null : null,
      reviewedAt: reviewed ? new Date().toISOString() : null,
    };
  });
  return { items, errors };
}

export function mapContentPublications(
  inputs: readonly ReviewContentPublicationSyncInput[],
  fieldPrefix: string[] = []
): ContentCollectionMappingResult<
  Omit<
    NewContentPublication,
    "id" | "storeId" | "contentId" | "createdAt" | "updatedAt"
  >
> {
  const errors: UserError[] = [];
  const destinations = new Set<string>();
  const items = inputs.map((input, index) => {
    const itemPrefix = [...fieldPrefix, String(index)];
    const channel = input.channel.trim();
    const locale = input.locale?.trim() || null;
    const destination = `${channel}\u0000${locale ?? ""}`;
    if (!channel || channel.length > 64) {
      errors.push({ message: "Publication channel must contain between 1 and 64 characters", code: "INVALID_CHANNEL", field: [...itemPrefix, "channel"] });
    } else if (destinations.has(destination)) {
      errors.push({ message: "Publication destination must be unique", code: "DUPLICATE_DESTINATION", field: itemPrefix });
    }
    if (locale && locale.length > 35) {
      errors.push({ message: "Publication locale cannot exceed 35 characters", code: "INVALID_LOCALE", field: [...itemPrefix, "locale"] });
    }
    destinations.add(destination);
    if (input.status === "SCHEDULED" && !input.scheduledAt) {
      errors.push({ message: "Scheduled publication requires scheduledAt", code: "INVALID_SCHEDULE", field: [...itemPrefix, "scheduledAt"] });
    }
    if (
      input.status === "SCHEDULED" &&
      input.scheduledAt &&
      (!Number.isFinite(Date.parse(input.scheduledAt)) ||
        Date.parse(input.scheduledAt) < Date.now())
    ) {
      errors.push({ message: "Scheduled publication must use a valid future date", code: "INVALID_SCHEDULE", field: [...itemPrefix, "scheduledAt"] });
    }
    if (input.status === "FAILED") {
      errors.push({ message: "FAILED status is reserved for publication delivery", code: "INVALID_STATUS", field: [...itemPrefix, "status"] });
    }
    const now = new Date().toISOString();
    return {
      channel,
      locale,
      status: input.status,
      scheduledAt: input.status === "SCHEDULED" ? input.scheduledAt ?? null : null,
      publishedAt: input.status === "PUBLISHED" ? now : null,
      unpublishedAt: input.status === "UNPUBLISHED" ? now : null,
      lastError: null,
    };
  });
  return { items, errors };
}

export function mapNestedContentUpdate(
  current: ContentItem,
  input: ReviewContentUpdateInput,
  kind: ContentKind,
  actorId?: string,
  fieldPrefix: string[] = []
): NestedContentUpdateMappingResult {
  const result: NestedContentUpdateMappingResult = { patch: {}, errors: [] };
  if (input.text) {
    mergePatchResult(
      result,
      mapContentTextUpdate(current, input.text, kind, [...fieldPrefix, "text"])
    );
  }
  if (input.author) {
    mergePatchResult(
      result,
      mapContentAuthorUpdate(current, input.author, [...fieldPrefix, "author"])
    );
  }
  if (input.source) {
    mergePatchResult(
      result,
      mapContentSourceUpdate(current, input.source, [...fieldPrefix, "source"])
    );
  }
  if (input.moderation) {
    mergePatchResult(
      result,
      mapContentModerationUpdate(
        current,
        input.moderation,
        actorId,
        [...fieldPrefix, "moderation"]
      )
    );
  }
  if (input.translations != null) {
    const mapped = mapContentTranslations(
      input.translations,
      kind,
      actorId,
      [...fieldPrefix, "translations"]
    );
    result.translations = mapped.items;
    result.errors.push(...mapped.errors);
  }
  if (input.publications != null) {
    const mapped = mapContentPublications(input.publications, [
      ...fieldPrefix,
      "publications",
    ]);
    result.publications = mapped.items;
    result.errors.push(...mapped.errors);
  }
  return result;
}

function mergePatchResult(
  target: NestedContentUpdateMappingResult,
  source: ContentPatchMappingResult
) {
  Object.assign(target.patch, source.patch);
  target.errors.push(...source.errors);
}

function changedPatch(current: ContentItem, patch: ContentPatch): ContentPatch {
  const result: ContentPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    const currentValue = current[key as keyof ContentItem];
    const equal =
      isRecord(value) && isRecord(currentValue)
        ? JSON.stringify(value) === JSON.stringify(currentValue)
        : value === currentValue;
    if (!equal) Object.assign(result, { [key]: value });
  }
  return result;
}

function minimumBodyLength(kind: ContentKind): number {
  if (kind === "REVIEW") return 20;
  if (kind === "PRODUCT_QUESTION" || kind === "QUESTION_ANSWER") return 10;
  return 1;
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
