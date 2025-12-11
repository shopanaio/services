import type { GraphQLResolveInfo } from "graphql";
import {
  parseResolveInfo,
  ResolveTree,
  FieldsByTypeName,
} from "graphql-parse-resolve-info";
import type { QueryArgs } from "../types.js";

/**
 * Converts parsed resolve info fields to QueryArgs format.
 * Supports aliases: keys are aliases, fieldName contains the actual method name.
 */
function convertToQueryArgs(fieldsByTypeName: FieldsByTypeName): QueryArgs {
  const fields: string[] = [];
  const populate: Record<string, QueryArgs> = {};

  // Merge fields from all types (handles interface/union types)
  const allFields: Record<string, ResolveTree> = {};
  for (const typeFields of Object.values(fieldsByTypeName)) {
    Object.assign(allFields, typeFields);
  }

  for (const [alias, field] of Object.entries(allFields)) {
    // Skip introspection fields
    if (alias.startsWith("__")) continue;

    const hasChildren = Object.keys(field.fieldsByTypeName).length > 0;
    const hasArgs = Object.keys(field.args).length > 0;
    const isAlias = alias !== field.name;

    if (hasChildren || hasArgs || isAlias) {
      // Relation field or field with args
      populate[alias] = {
        fieldName: isAlias ? field.name : undefined,
        args: hasArgs ? field.args : undefined,
        ...convertToQueryArgs(field.fieldsByTypeName),
      };
    } else {
      // Scalar field
      fields.push(alias);
    }
  }

  return {
    fields: fields.length > 0 ? fields : undefined,
    populate: Object.keys(populate).length > 0 ? populate : undefined,
  };
}

/**
 * Parses GraphQL resolve info into QueryArgs format.
 *
 * @param info - GraphQL resolve info from resolver
 * @param fieldName - Optional field name to extract sub-fields from (e.g., "warehouse", "product").
 *                    If not provided, returns top-level fields.
 * @returns QueryArgs that can be passed to executor
 *
 * @example
 * ```ts
 * // Extract fields for warehouse from WarehouseCreatePayload:
 * const warehouseFields = parseGraphqlInfo(info, "warehouse");
 * await WarehouseView.load(warehouseId, warehouseFields, ctx);
 *
 * // For __resolveReference or direct type resolvers (top-level fields):
 * const fields = parseGraphqlInfo(info);
 * await ProductView.load(productId, fields, ctx);
 * ```
 */
export function parseGraphqlInfo(
  info: GraphQLResolveInfo,
  fieldName?: string
): QueryArgs {
  const parsed = parseResolveInfo(info);
  if (!parsed) {
    return {};
  }

  const resolveTree = parsed as ResolveTree;

  // If fieldName provided, extract that field's children
  if (fieldName) {
    for (const fields of Object.values(resolveTree.fieldsByTypeName)) {
      const field = fields[fieldName];
      if (field) {
        return convertToQueryArgs(field.fieldsByTypeName);
      }
    }
    return {};
  }

  // Otherwise return top-level fields
  return convertToQueryArgs(resolveTree.fieldsByTypeName);
}
