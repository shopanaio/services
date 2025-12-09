import type { GraphQLResolveInfo } from "graphql";
import { parseResolveInfo, ResolveTree, FieldsByTypeName } from "graphql-parse-resolve-info";
import type { FieldArgsTreeFor, TypeClass, FieldArgsNode } from "../types.js";

/**
 * Gets field names that have children from TypeClass static fields
 */
function getFieldsWithChildren<T extends TypeClass>(Type: T): Set<string> {
  const fields = new Set<string>();
  const typeFields = (Type as unknown as { fields?: Record<string, () => TypeClass> }).fields;

  if (typeFields) {
    for (const key of Object.keys(typeFields)) {
      fields.add(key);
    }
  }

  return fields;
}

/**
 * Recursively collects all fields with children by traversing static fields.
 * This version traverses the full type hierarchy to support deeply nested queries.
 */
function collectAllFieldsWithChildren(
  Type: TypeClass,
  visited: Set<TypeClass> = new Set()
): Set<string> {
  if (visited.has(Type)) return new Set();
  visited.add(Type);

  const fields = new Set<string>();
  const typeFields = (Type as unknown as { fields?: Record<string, () => TypeClass> }).fields;

  if (typeFields) {
    for (const [key, getChildType] of Object.entries(typeFields)) {
      fields.add(key);
      const childType = getChildType();
      const childFields = collectAllFieldsWithChildren(childType, visited);
      for (const childField of childFields) {
        fields.add(childField);
      }
    }
  }

  return fields;
}

/**
 * Converts parsed resolve info fields to FieldArgsTree format.
 * Supports aliases: keys are aliases, fieldName contains the actual method name.
 */
function mapFieldsToArgsTree(
  fieldsByTypeName: FieldsByTypeName,
  fieldsWithChildren: Set<string>
): Record<string, FieldArgsNode> {
  const result: Record<string, FieldArgsNode> = {};

  // Merge fields from all types (handles interface/union types)
  const allFields: Record<string, ResolveTree> = {};
  for (const fields of Object.values(fieldsByTypeName)) {
    Object.assign(allFields, fields);
  }

  for (const [alias, field] of Object.entries(allFields)) {
    // Skip introspection fields
    if (alias.startsWith("__")) continue;

    // field.name is the actual method name, alias is what it was requested as
    const actualFieldName = field.name;
    const isAlias = alias !== actualFieldName;

    const hasArgs = Object.keys(field.args).length > 0;
    // Use actual field name to check if it has children in the type
    const hasChildren = fieldsWithChildren.has(actualFieldName) &&
      Object.keys(field.fieldsByTypeName).length > 0;

    // Always include the field if it was requested (for selective resolution)
    const node: FieldArgsNode = {};

    // Include fieldName when using an alias so executor knows which method to call
    if (isAlias) {
      node.fieldName = actualFieldName;
    }

    if (hasArgs) {
      node.args = field.args;
    }

    if (hasChildren) {
      const children = mapFieldsToArgsTree(field.fieldsByTypeName, fieldsWithChildren);
      if (Object.keys(children).length > 0) {
        node.children = children;
      }
    }

    // Always add the node (even if empty) so executor knows to resolve this field
    result[alias] = node;
  }

  return result;
}

/**
 * Parses GraphQL resolve info into a typed FieldArgsTree for the executor.
 *
 * Uses the direct fields from the TypeClass to determine which fields have children.
 * For deeply nested queries where child types also have nested fields, use `parseGraphQLInfoDeep`.
 *
 * @param info - GraphQL resolve info from resolver
 * @param Type - The TypeClass being resolved (used to determine which fields have children)
 * @returns FieldArgsTree that can be passed to executor.resolve()
 *
 * @example
 * ```ts
 * // In a GraphQL resolver:
 * const argsTree = parseGraphQLInfo(info, ProductType);
 * await executor.resolve(ProductType, productId, argsTree);
 * ```
 */
export function parseGraphQLInfo<T extends TypeClass>(
  info: GraphQLResolveInfo,
  Type: T
): FieldArgsTreeFor<T> {
  const parsed = parseResolveInfo(info);
  if (!parsed) {
    return {} as FieldArgsTreeFor<T>;
  }

  const resolveTree = parsed as ResolveTree;
  const fieldsWithChildren = getFieldsWithChildren(Type);

  return mapFieldsToArgsTree(
    resolveTree.fieldsByTypeName,
    fieldsWithChildren
  ) as FieldArgsTreeFor<T>;
}

/**
 * Deep version of parseGraphQLInfo that handles nested types.
 *
 * Traverses the full type hierarchy via `static fields` to determine which fields
 * have children at any nesting level. Use this when your query includes nested
 * types that also have their own nested fields.
 *
 * @param info - GraphQL resolve info from resolver
 * @param Type - The root TypeClass being resolved
 * @returns FieldArgsTree that can be passed to executor.resolve()
 *
 * @example
 * ```ts
 * // For queries with deep nesting like:
 * // product { variants { images { url } } }
 * const argsTree = parseGraphQLInfoDeep(info, ProductType);
 * await executor.resolve(ProductType, productId, argsTree);
 * ```
 */
export function parseGraphQLInfoDeep<T extends TypeClass>(
  info: GraphQLResolveInfo,
  Type: T
): FieldArgsTreeFor<T> {
  const parsed = parseResolveInfo(info);
  if (!parsed) {
    return {} as FieldArgsTreeFor<T>;
  }

  const resolveTree = parsed as ResolveTree;
  const fieldsWithChildren = collectAllFieldsWithChildren(Type);

  return mapFieldsToArgsTree(
    resolveTree.fieldsByTypeName,
    fieldsWithChildren
  ) as FieldArgsTreeFor<T>;
}
