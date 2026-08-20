import type { WhereFieldMapper } from "@shopana/drizzle-query";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { GraphQLError } from "graphql";

interface SearchRelayPaginationInput {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}

function createGlobalIdWhereFieldMapper(entity: GlobalIdType): WhereFieldMapper {
  return (value) => {
    if (typeof value !== "string") return value;

    try {
      return decodeGlobalIdByType(value, entity);
    } catch {
      return value;
    }
  };
}

export const decodeSearchSynonymGroupGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.SearchSynonymGroup,
);

export const decodeSearchProductBoostGlobalId = createGlobalIdWhereFieldMapper(
  GlobalIdEntity.SearchProductBoost,
);

export function normalizeSearchRelayPagination<TInput extends SearchRelayPaginationInput>(
  input: TInput,
): TInput {
  const hasFirst = input.first != null;
  const hasLast = input.last != null;
  const hasAfter = input.after != null;
  const hasBefore = input.before != null;

  if (hasFirst && hasLast) {
    throwBadUserInput("Use either first or last, not both", ["first", "last"]);
  }
  if (hasAfter && hasBefore) {
    throwBadUserInput("Use either after or before, not both", ["after", "before"]);
  }
  if (hasAfter && hasLast) {
    throwBadUserInput("after is only valid with forward pagination", ["after"]);
  }
  if (hasBefore && (hasFirst || !hasLast)) {
    throwBadUserInput("before is only valid with backward pagination", ["before"]);
  }

  if (!hasFirst && !hasLast) {
    return { ...input, first: 20 };
  }

  return input;
}

function throwBadUserInput(message: string, field: string[]): never {
  throw new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT", field },
  });
}
