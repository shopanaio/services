import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type { ContentRestorePatch } from "../../repositories/content/ContentRepository.js";
import type { ContentItem } from "../../repositories/models/index.js";
import { conflictError, internalError, notFoundError } from "./StoreConfigurationUpdateScript.js";
import type {
  ContentRedactParams,
  ContentRedactResult,
  ContentRevisionRestoreParams,
  ContentRevisionRestoreResult,
} from "./types.js";

export class ContentRedactScript extends BaseScript<ContentRedactParams, ContentRedactResult> {
  @Transactional()
  protected async execute(params: ContentRedactParams): Promise<ContentRedactResult> {
    const current = await this.repository.content.findById(params.contentId);
    if (!current) return { userErrors: [notFoundError("Content", "contentId")] };
    if (current.redactedAt) {
      return {
        userErrors: [
          {
            message: "Content has already been redacted",
            code: "ALREADY_REDACTED",
            field: ["contentId"],
          },
        ],
      };
    }

    const updated = await this.repository.content.redact(params.contentId);
    if (updated.status !== "applied") {
      return updated.status === "conflict"
        ? { userErrors: [conflictError("Content", "expectedRevision")] }
        : { userErrors: [notFoundError("Content", "contentId")] };
    }
    await this.ensureRevision(current, "Content redacted");

    await this.repository.moderation.appendEvent({
      contentId: current.id,
      caseId: null,
      action: "REDACTED",
      fromStatus: current.status,
      toStatus: updated.value.status,
      actorType: this.context.hasUser ? "USER" : "SYSTEM",
      actorId: this.context.hasUser ? this.currentUser.id : null,
      reasonCode: "PRIVACY_REDACTION",
      note: null,
      isAutomated: !this.context.hasUser,
      metadata: { previousRevision: current.revision },
    });
    return { content: { id: updated.value.id }, userErrors: [] };
  }

  protected handleError(): ContentRedactResult {
    return { userErrors: [internalError()] };
  }

  private async ensureRevision(current: ContentItem, reason: string) {
    if (await this.repository.moderation.findRevision(current.id, current.revision)) return;
    await this.repository.moderation.appendRevision({
      contentId: current.id,
      revision: current.revision,
      snapshot: contentSnapshot(current),
      changedByType: this.context.hasUser ? "USER" : "SYSTEM",
      changedById: this.context.hasUser ? this.currentUser.id : null,
      changeReason: reason,
    });
  }
}

export class ContentRevisionRestoreScript extends BaseScript<
  ContentRevisionRestoreParams,
  ContentRevisionRestoreResult
> {
  @Transactional()
  protected async execute(
    params: ContentRevisionRestoreParams,
  ): Promise<ContentRevisionRestoreResult> {
    const current = await this.repository.content.findById(params.contentId);
    if (!current) return { userErrors: [notFoundError("Content", "contentId")] };
    const revision = await this.repository.moderation.findRevision(
      params.contentId,
      params.revision,
    );
    if (!revision) {
      return {
        userErrors: [
          {
            message: "Content revision not found",
            code: "REVISION_NOT_FOUND",
            field: ["revision"],
          },
        ],
      };
    }
    const restored = restorePatch(revision.snapshot);
    if (!restored.value) return { userErrors: restored.errors };

    const updated = await this.repository.content.restore(
      params.contentId,

      restored.value,
    );
    if (updated.status !== "applied") {
      return updated.status === "conflict"
        ? { userErrors: [conflictError("Content", "expectedRevision")] }
        : { userErrors: [notFoundError("Content", "contentId")] };
    }
    if (!(await this.repository.moderation.findRevision(current.id, current.revision))) {
      await this.repository.moderation.appendRevision({
        contentId: current.id,
        revision: current.revision,
        snapshot: contentSnapshot(current),
        changedByType: this.context.hasUser ? "USER" : "SYSTEM",
        changedById: this.context.hasUser ? this.currentUser.id : null,
        changeReason: `Before restoring revision ${params.revision}`,
      });
    }

    await this.repository.moderation.appendEvent({
      contentId: current.id,
      caseId: null,
      action: "RESTORED",
      fromStatus: current.status,
      toStatus: updated.value.status,
      actorType: this.context.hasUser ? "USER" : "SYSTEM",
      actorId: this.context.hasUser ? this.currentUser.id : null,
      reasonCode: "REVISION_RESTORE",
      note: null,
      isAutomated: !this.context.hasUser,
      metadata: {
        previousRevision: current.revision,
        restoredRevision: params.revision,
      },
    });
    return { content: { id: updated.value.id }, userErrors: [] };
  }

  protected handleError(): ContentRevisionRestoreResult {
    return { userErrors: [internalError()] };
  }
}

function contentSnapshot(content: ContentItem): Record<string, unknown> {
  return {
    title: content.title,
    body: content.body,
    locale: content.locale,
    authorType: content.authorType,
    authorCustomerId: content.authorCustomerId,
    authorPrincipalId: content.authorPrincipalId,
    authorDisplayName: content.authorDisplayName,
    authorEmail: content.authorEmail,
    sourceChannel: content.sourceChannel,
    sourceMetadata: content.sourceMetadata,
    idempotencyKey: content.idempotencyKey,
    status: content.status,
    moderationNote: content.moderationNote,
    moderatedByPrincipalId: content.moderatedByPrincipalId,
    moderatedAt: content.moderatedAt,
    publishedAt: content.publishedAt,
    unpublishedAt: content.unpublishedAt,
    redactedAt: content.redactedAt,
  };
}

function restorePatch(snapshot: Record<string, unknown>): {
  value?: ContentRestorePatch;
  errors: UserError[];
} {
  const authorTypes = new Set(["CUSTOMER", "GUEST", "SELLER", "STAFF", "SYSTEM", "EXTERNAL"]);
  const statuses = new Set(["PENDING", "PUBLISHED", "REJECTED"]);
  const valid =
    nullableString(snapshot.title) &&
    typeof snapshot.body === "string" &&
    snapshot.body.length > 0 &&
    typeof snapshot.locale === "string" &&
    snapshot.locale.length > 0 &&
    snapshot.locale.length <= 35 &&
    typeof snapshot.authorType === "string" &&
    authorTypes.has(snapshot.authorType) &&
    nullableString(snapshot.authorCustomerId) &&
    nullableString(snapshot.authorPrincipalId) &&
    typeof snapshot.authorDisplayName === "string" &&
    snapshot.authorDisplayName.length > 0 &&
    nullableString(snapshot.authorEmail) &&
    typeof snapshot.sourceChannel === "string" &&
    snapshot.sourceChannel.length > 0 &&
    isRecord(snapshot.sourceMetadata) &&
    nullableString(snapshot.idempotencyKey) &&
    typeof snapshot.status === "string" &&
    statuses.has(snapshot.status) &&
    nullableString(snapshot.moderationNote) &&
    nullableString(snapshot.moderatedByPrincipalId) &&
    nullableString(snapshot.moderatedAt) &&
    nullableString(snapshot.publishedAt) &&
    nullableString(snapshot.unpublishedAt) &&
    (snapshot.redactedAt === undefined || nullableString(snapshot.redactedAt));

  if (!valid) {
    return {
      errors: [
        {
          message: "The stored revision snapshot is invalid",
          code: "INVALID_REVISION_SNAPSHOT",
          field: ["revision"],
        },
      ],
    };
  }

  return {
    value: {
      title: snapshot.title as string | null,
      body: snapshot.body as string,
      locale: snapshot.locale as string,
      authorType: snapshot.authorType as ContentRestorePatch["authorType"],
      authorCustomerId: snapshot.authorCustomerId as string | null,
      authorPrincipalId: snapshot.authorPrincipalId as string | null,
      authorDisplayName: snapshot.authorDisplayName as string,
      authorEmail: snapshot.authorEmail as string | null,
      sourceChannel: snapshot.sourceChannel as string,
      sourceMetadata: snapshot.sourceMetadata as Record<string, unknown>,
      idempotencyKey: snapshot.idempotencyKey as string | null,
      status: snapshot.status as ContentRestorePatch["status"],
      moderationNote: snapshot.moderationNote as string | null,
      moderatedByPrincipalId: snapshot.moderatedByPrincipalId as string | null,
      moderatedAt: snapshot.moderatedAt as string | null,
      publishedAt: snapshot.publishedAt as string | null,
      unpublishedAt: snapshot.unpublishedAt as string | null,
      redactedAt: (snapshot.redactedAt as string | null | undefined) ?? null,
    },
    errors: [],
  };
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
