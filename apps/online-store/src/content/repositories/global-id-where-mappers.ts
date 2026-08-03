import type { WhereFieldMapper } from "@shopana/drizzle-query";
import {
  decodeGlobalIdByType,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";

export function createGlobalIdWhereFieldMapper(
  entity: GlobalIdType,
): WhereFieldMapper {
  return (value) => {
    if (typeof value !== "string") return value;

    try {
      return decodeGlobalIdByType(value, entity);
    } catch {
      return value;
    }
  };
}
