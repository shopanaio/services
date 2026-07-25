import type { WhereFieldMapper } from "@shopana/drizzle-query";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";

function createGlobalIdWhereFieldMapper(
  entity: GlobalIdType,
): WhereFieldMapper {
  return (value) => {
    if (typeof value !== "string") {
      return value;
    }

    try {
      return decodeGlobalIdByType(value, entity);
    } catch {
      return value;
    }
  };
}

export const decodeAppInstallationGlobalId =
  createGlobalIdWhereFieldMapper(GlobalIdEntity.AppInstallation);
