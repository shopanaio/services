import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { UserError } from "../../kernel/BaseScript.js";
import type { ProductQuestionUpdateOperation } from "../../workflows/dto/index.js";
import type {
  ProductQuestionAnswerCreateOperationInput,
  ProductQuestionAnswerUpdateOperationInput,
  ProductQuestionSubjectUpdateInput,
  ProductQuestionUpdateInput,
  ReviewContentCreateInput,
  ReviewContentUpdateInput,
} from "./generated/types.js";

export interface ProductQuestionUpdateMappedEntry {
  type: ProductQuestionUpdateOperation["type"];
  operation?: ProductQuestionUpdateOperation;
  errors: UserError[];
  clientMutationId?: string;
  entityId?: string;
}

export interface ProductQuestionUpdateMappingResult {
  operations: ProductQuestionUpdateOperation[];
  entries: ProductQuestionUpdateMappedEntry[];
  errors: UserError[];
}

export function mapProductQuestionUpdateInput(
  input?: ProductQuestionUpdateInput | null
): ProductQuestionUpdateMappingResult {
  const entries: ProductQuestionUpdateMappedEntry[] = [];

  if (input?.content?.text) {
    entries.push(
      validEntry({
        type: "contentUpdate",
        params: input.content.text,
        meta: { fieldPrefix: ["operations", "content", "text"] },
      })
    );
  }

  if (input?.content?.author) {
    const errors: UserError[] = [];
    const fieldPrefix = ["operations", "content", "author"];
    const params = mapContentAuthorUpdateInput(
      input.content.author,
      fieldPrefix,
      errors
    );
    entries.push(
      mappedEntry(
        { type: "contentAuthorUpdate", params, meta: { fieldPrefix } },
        errors
      )
    );
  }

  if (input?.content?.source) {
    entries.push(
      validEntry({
        type: "contentSourceUpdate",
        params: input.content.source,
        meta: { fieldPrefix: ["operations", "content", "source"] },
      })
    );
  }

  if (input?.content?.moderation) {
    entries.push(
      validEntry({
        type: "contentModerationUpdate",
        params: input.content.moderation,
        meta: { fieldPrefix: ["operations", "content", "moderation"] },
      })
    );
  }

  if (input?.content?.translations != null) {
    entries.push(
      validEntry({
        type: "contentTranslationsSync",
        params: { items: input.content.translations },
        meta: { fieldPrefix: ["operations", "content", "translations"] },
      })
    );
  }

  if (input?.content?.publications != null) {
    entries.push(
      validEntry({
        type: "contentPublicationsSync",
        params: { items: input.content.publications },
        meta: { fieldPrefix: ["operations", "content", "publications"] },
      })
    );
  }

  if (input?.subject) entries.push(mapSubject(input.subject));

  for (const [index, item] of (input?.answers?.create ?? []).entries()) {
    entries.push(mapAnswerCreate(item, index));
  }
  for (const [index, item] of (input?.answers?.update ?? []).entries()) {
    entries.push(mapAnswerUpdate(item, index));
  }
  for (const [index, item] of (input?.answers?.delete ?? []).entries()) {
    const errors: UserError[] = [];
    const fieldPrefix = ["operations", "answers", "delete", String(index)];
    const answerId = decodeId(
      item.answerId,
      GlobalIdEntity.ProductQuestionAnswer,
      [...fieldPrefix, "answerId"],
      errors
    );
    const operation: ProductQuestionUpdateOperation = {
      type: "productQuestionAnswerDelete",
      params: { ...item, answerId: answerId ?? item.answerId },
      meta: { fieldPrefix },
    };
    entries.push({
      ...mappedEntry(operation, errors),
      entityId: answerId,
    });
  }

  return {
    operations: entries.flatMap((entry) =>
      entry.operation ? [entry.operation] : []
    ),
    entries,
    errors: entries.flatMap((entry) => entry.errors),
  };
}

function mapSubject(
  input: ProductQuestionSubjectUpdateInput
): ProductQuestionUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "subject"];
  const params: ProductQuestionSubjectUpdateInput = { ...input };
  for (const [field, type] of [
    ["productId", GlobalIdEntity.Product],
    ["variantId", GlobalIdEntity.Variant],
  ] as const) {
    if (!hasOwn(input, field)) continue;
    params[field] = decodeOptionalId(
      input[field],
      type,
      [...fieldPrefix, field],
      errors
    );
  }
  return mappedEntry(
    { type: "productQuestionUpdate", params, meta: { fieldPrefix } },
    errors
  );
}

function mapAnswerCreate(
  input: ProductQuestionAnswerCreateOperationInput,
  index: number
): ProductQuestionUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "answers", "create", String(index)];
  const content = mapContentCreateInput(
    input.content,
    [...fieldPrefix, "content"],
    errors
  );
  const operation: ProductQuestionUpdateOperation = {
    type: "productQuestionAnswerCreate",
    params: { ...input, content },
    meta: { fieldPrefix },
  };
  return {
    ...mappedEntry(operation, errors),
    clientMutationId: input.clientMutationId ?? undefined,
  };
}

function mapAnswerUpdate(
  input: ProductQuestionAnswerUpdateOperationInput,
  index: number
): ProductQuestionUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "answers", "update", String(index)];
  const answerId = decodeId(
    input.answerId,
    GlobalIdEntity.ProductQuestionAnswer,
    [...fieldPrefix, "answerId"],
    errors
  );
  const operations = mapContentUpdateInput(
    input.operations,
    [...fieldPrefix, "operations"],
    errors
  );
  const operation: ProductQuestionUpdateOperation = {
    type: "productQuestionAnswerUpdate",
    params: {
      ...input,
      answerId: answerId ?? input.answerId,
      operations,
    },
    meta: { fieldPrefix },
  };
  return {
    ...mappedEntry(operation, errors),
    entityId: answerId,
  };
}

function mapContentCreateInput(
  input: ReviewContentCreateInput,
  fieldPrefix: string[],
  errors: UserError[]
): ReviewContentCreateInput {
  return {
    ...input,
    author: {
      ...input.author,
      customerId: decodeOptionalId(
        input.author.customerId,
        GlobalIdEntity.Customer,
        [...fieldPrefix, "author", "customerId"],
        errors
      ),
    },
  };
}

function mapContentUpdateInput(
  input: ProductQuestionAnswerUpdateOperationInput["operations"],
  fieldPrefix: string[],
  errors: UserError[]
): ProductQuestionAnswerUpdateOperationInput["operations"] {
  const content: ReviewContentUpdateInput | null | undefined =
    input.content == null
      ? input.content
      : {
          ...input.content,
          author: input.content.author
            ? mapContentAuthorUpdateInput(
                input.content.author,
                [...fieldPrefix, "content", "author"],
                errors
              )
            : input.content.author,
        };
  return { ...input, content };
}

function mapContentAuthorUpdateInput(
  input: NonNullable<ReviewContentUpdateInput["author"]>,
  fieldPrefix: string[],
  errors: UserError[]
): NonNullable<ReviewContentUpdateInput["author"]> {
  const result = { ...input };
  if (hasOwn(input, "customerId")) {
    result.customerId = decodeOptionalId(
      input.customerId,
      GlobalIdEntity.Customer,
      [...fieldPrefix, "customerId"],
      errors
    );
  }
  return result;
}

function validEntry(
  operation: ProductQuestionUpdateOperation
): ProductQuestionUpdateMappedEntry {
  return { type: operation.type, operation, errors: [] };
}

function mappedEntry(
  operation: ProductQuestionUpdateOperation,
  errors: UserError[]
): ProductQuestionUpdateMappedEntry {
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
  errors: UserError[]
): string | null | undefined {
  return value == null
    ? value
    : decodeId(value, expectedType, field, errors);
}

function decodeId(
  globalId: string,
  expectedType: GlobalIdType,
  field: string[],
  errors: UserError[]
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
