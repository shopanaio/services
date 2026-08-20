import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { UserError } from "../../kernel/BaseScript.js";
import type { ReviewUpdateOperation } from "../../workflows/dto/index.js";
import type {
  ReviewContentCreateInput,
  ReviewContentUpdateInput,
  ReviewReplyCreateOperationInput,
  ReviewReplyUpdateOperationInput,
  ReviewSubjectUpdateInput,
  ReviewUpdateInput,
} from "./generated/types.js";

export interface ReviewUpdateMappedEntry {
  type: ReviewUpdateOperation["type"];
  operation?: ReviewUpdateOperation;
  errors: UserError[];
  clientMutationId?: string;
  entityId?: string;
}

export interface ReviewUpdateMappingResult {
  operations: ReviewUpdateOperation[];
  entries: ReviewUpdateMappedEntry[];
  errors: UserError[];
}

export function mapReviewUpdateInput(input?: ReviewUpdateInput | null): ReviewUpdateMappingResult {
  const entries: ReviewUpdateMappedEntry[] = [];

  if (input?.content?.text) {
    entries.push(
      validEntry({
        type: "contentUpdate",
        params: input.content.text,
        meta: { fieldPrefix: ["operations", "content", "text"] },
      }),
    );
  }

  if (input?.content?.author) {
    const errors: UserError[] = [];
    const fieldPrefix = ["operations", "content", "author"];
    const params = { ...input.content.author };
    if (hasOwn(input.content.author, "customerId")) {
      params.customerId = decodeOptionalId(
        input.content.author.customerId,
        GlobalIdEntity.Customer,
        [...fieldPrefix, "customerId"],
        errors,
      );
    }
    entries.push(
      mappedEntry({ type: "contentAuthorUpdate", params, meta: { fieldPrefix } }, errors),
    );
  }

  if (input?.content?.source) {
    entries.push(
      validEntry({
        type: "contentSourceUpdate",
        params: input.content.source,
        meta: { fieldPrefix: ["operations", "content", "source"] },
      }),
    );
  }

  if (input?.content?.moderation) {
    entries.push(
      validEntry({
        type: "contentModerationUpdate",
        params: input.content.moderation,
        meta: { fieldPrefix: ["operations", "content", "moderation"] },
      }),
    );
  }

  if (input?.content?.translations != null) {
    entries.push(
      validEntry({
        type: "contentTranslationsSync",
        params: { items: input.content.translations },
        meta: { fieldPrefix: ["operations", "content", "translations"] },
      }),
    );
  }

  if (input?.content?.publications != null) {
    entries.push(
      validEntry({
        type: "contentPublicationsSync",
        params: { items: input.content.publications },
        meta: { fieldPrefix: ["operations", "content", "publications"] },
      }),
    );
  }

  if (input?.subject) entries.push(mapSubject(input.subject));
  if (input?.rating) entries.push(mapRating(input.rating));

  if (input?.verification) {
    entries.push(
      validEntry({
        type: "reviewVerificationUpdate",
        params: input.verification,
        meta: { fieldPrefix: ["operations", "verification"] },
      }),
    );
  }

  if (input?.incentive) {
    entries.push(
      validEntry({
        type: "reviewIncentiveUpdate",
        params: input.incentive,
        meta: { fieldPrefix: ["operations", "incentive"] },
      }),
    );
  }

  if (input?.media != null) entries.push(mapMedia(input.media));

  for (const [index, item] of (input?.replies?.create ?? []).entries()) {
    entries.push(mapReplyCreate(item, index));
  }
  for (const [index, item] of (input?.replies?.update ?? []).entries()) {
    entries.push(mapReplyUpdate(item, index));
  }
  for (const [index, item] of (input?.replies?.delete ?? []).entries()) {
    const errors: UserError[] = [];
    const fieldPrefix = ["operations", "replies", "delete", String(index)];
    const replyId = decodeId(
      item.replyId,
      GlobalIdEntity.ReviewReply,
      [...fieldPrefix, "replyId"],
      errors,
    );
    const operation: ReviewUpdateOperation = {
      type: "reviewReplyDelete",
      params: { ...item, replyId: replyId ?? item.replyId },
      meta: { fieldPrefix },
    };
    entries.push({
      ...mappedEntry(operation, errors),
      entityId: replyId,
    });
  }

  return {
    operations: entries.flatMap((entry) => (entry.operation ? [entry.operation] : [])),
    entries,
    errors: entries.flatMap((entry) => entry.errors),
  };
}

function mapSubject(input: ReviewSubjectUpdateInput): ReviewUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "subject"];
  const params: ReviewSubjectUpdateInput = { ...input };
  for (const [field, type] of [
    ["productId", GlobalIdEntity.Product],
    ["variantId", GlobalIdEntity.Variant],
    ["orderId", GlobalIdEntity.Order],
    ["orderLineId", GlobalIdEntity.OrderLine],
  ] as const) {
    if (!hasOwn(input, field)) continue;
    params[field] = decodeOptionalId(input[field], type, [...fieldPrefix, field], errors);
  }
  return mappedEntry({ type: "reviewSubjectUpdate", params, meta: { fieldPrefix } }, errors);
}

function mapRating(input: NonNullable<ReviewUpdateInput["rating"]>): ReviewUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "rating"];
  const params = {
    ...input,
    criteria: input.criteria?.map((item, index) => ({
      ...item,
      criterionId:
        decodeId(
          item.criterionId,
          GlobalIdEntity.ReviewRatingCriterion,
          [...fieldPrefix, "criteria", String(index), "criterionId"],
          errors,
        ) ?? item.criterionId,
    })),
  };
  return mappedEntry({ type: "reviewRatingUpdate", params, meta: { fieldPrefix } }, errors);
}

function mapMedia(input: NonNullable<ReviewUpdateInput["media"]>): ReviewUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "media"];
  const items = input.map((item, index) => ({
    ...item,
    fileId:
      decodeId(
        item.fileId,
        GlobalIdEntity.File,
        [...fieldPrefix, String(index), "fileId"],
        errors,
      ) ?? item.fileId,
  }));
  return mappedEntry({ type: "reviewMediaSync", params: { items }, meta: { fieldPrefix } }, errors);
}

function mapReplyCreate(
  input: ReviewReplyCreateOperationInput,
  index: number,
): ReviewUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "replies", "create", String(index)];
  const content = mapContentCreateInput(input.content, [...fieldPrefix, "content"], errors);
  const operation: ReviewUpdateOperation = {
    type: "reviewReplyCreate",
    params: { ...input, content },
    meta: { fieldPrefix },
  };
  return {
    ...mappedEntry(operation, errors),
    clientMutationId: input.clientMutationId ?? undefined,
  };
}

function mapReplyUpdate(
  input: ReviewReplyUpdateOperationInput,
  index: number,
): ReviewUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "replies", "update", String(index)];
  const replyId = decodeId(
    input.replyId,
    GlobalIdEntity.ReviewReply,
    [...fieldPrefix, "replyId"],
    errors,
  );
  const operations = mapContentUpdateInput(
    input.operations,
    [...fieldPrefix, "operations"],
    errors,
  );
  const operation: ReviewUpdateOperation = {
    type: "reviewReplyUpdate",
    params: {
      ...input,
      replyId: replyId ?? input.replyId,
      operations,
    },
    meta: { fieldPrefix },
  };
  return {
    ...mappedEntry(operation, errors),
    entityId: replyId,
  };
}

function mapContentCreateInput(
  input: ReviewContentCreateInput,
  fieldPrefix: string[],
  errors: UserError[],
): ReviewContentCreateInput {
  return {
    ...input,
    author: {
      ...input.author,
      customerId: decodeOptionalId(
        input.author.customerId,
        GlobalIdEntity.Customer,
        [...fieldPrefix, "author", "customerId"],
        errors,
      ),
    },
  };
}

function mapContentUpdateInput(
  input: ReviewReplyUpdateOperationInput["operations"],
  fieldPrefix: string[],
  errors: UserError[],
): ReviewReplyUpdateOperationInput["operations"] {
  const content: ReviewContentUpdateInput | null | undefined =
    input.content == null
      ? input.content
      : {
          ...input.content,
          author: input.content.author
            ? mapContentAuthorUpdateInput(
                input.content.author,
                [...fieldPrefix, "content", "author"],
                errors,
              )
            : input.content.author,
        };
  return { ...input, content };
}

function mapContentAuthorUpdateInput(
  input: NonNullable<ReviewContentUpdateInput["author"]>,
  fieldPrefix: string[],
  errors: UserError[],
): NonNullable<ReviewContentUpdateInput["author"]> {
  const result = { ...input };
  if (hasOwn(input, "customerId")) {
    result.customerId = decodeOptionalId(
      input.customerId,
      GlobalIdEntity.Customer,
      [...fieldPrefix, "customerId"],
      errors,
    );
  }
  return result;
}

function validEntry(operation: ReviewUpdateOperation): ReviewUpdateMappedEntry {
  return { type: operation.type, operation, errors: [] };
}

function mappedEntry(
  operation: ReviewUpdateOperation,
  errors: UserError[],
): ReviewUpdateMappedEntry {
  return {
    type: operation.type,
    operation: errors.length === 0 ? operation : undefined,
    errors,
  };
}

function decodeOptionalId(
  value: string | null | undefined,
  expectedType: GlobalIdType,
  field: string[],
  errors: UserError[],
): string | null | undefined {
  return value == null ? value : decodeId(value, expectedType, field, errors);
}

function decodeId(
  globalId: string,
  expectedType: GlobalIdType,
  field: string[],
  errors: UserError[],
): string | undefined {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    errors.push({
      message: "Invalid ID format",
      code: "INVALID_ID",
      field,
    });
    return undefined;
  }
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}
