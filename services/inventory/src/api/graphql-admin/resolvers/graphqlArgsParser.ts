import type { GraphQLResolveInfo, SelectionSetNode, FieldNode, ArgumentNode, ValueNode } from "graphql";
import type { FieldArgsTreeFor, TypeClass } from "@shopana/type-executor";

/**
 * Extracts argument value from GraphQL AST ValueNode
 */
function extractArgumentValue(
  valueNode: ValueNode,
  variables: Record<string, unknown>
): unknown {
  switch (valueNode.kind) {
    case "Variable":
      return variables[valueNode.name.value];
    case "IntValue":
      return parseInt(valueNode.value, 10);
    case "FloatValue":
      return parseFloat(valueNode.value);
    case "StringValue":
      return valueNode.value;
    case "BooleanValue":
      return valueNode.value;
    case "NullValue":
      return null;
    case "EnumValue":
      return valueNode.value;
    case "ListValue":
      return valueNode.values.map((v) => extractArgumentValue(v, variables));
    case "ObjectValue": {
      const obj: Record<string, unknown> = {};
      for (const field of valueNode.fields) {
        obj[field.name.value] = extractArgumentValue(field.value, variables);
      }
      return obj;
    }
    default:
      return undefined;
  }
}

/**
 * Extracts arguments from GraphQL field arguments AST
 */
function extractArguments(
  args: readonly ArgumentNode[],
  variables: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const arg of args) {
    result[arg.name.value] = extractArgumentValue(arg.value, variables);
  }
  return result;
}

/**
 * Recursively builds FieldArgsTree from GraphQL selection set
 */
function buildArgsTreeFromSelectionSet(
  selectionSet: SelectionSetNode | undefined,
  variables: Record<string, unknown>,
  fieldsWithChildren: Set<string>
): Record<string, { args?: Record<string, unknown>; children?: Record<string, unknown> }> {
  if (!selectionSet) return {};

  const result: Record<string, { args?: Record<string, unknown>; children?: Record<string, unknown> }> = {};

  for (const selection of selectionSet.selections) {
    if (selection.kind !== "Field") continue;

    const fieldName = selection.name.value;

    // Skip __typename and other introspection fields
    if (fieldName.startsWith("__")) continue;

    const hasArgs = selection.arguments && selection.arguments.length > 0;
    const hasChildren = selection.selectionSet && fieldsWithChildren.has(fieldName);

    if (hasArgs || hasChildren) {
      const node: { args?: Record<string, unknown>; children?: Record<string, unknown> } = {};

      if (hasArgs && selection.arguments) {
        node.args = extractArguments(selection.arguments, variables);
      }

      if (hasChildren && selection.selectionSet) {
        node.children = buildArgsTreeFromSelectionSet(
          selection.selectionSet,
          variables,
          fieldsWithChildren
        );
      }

      // Only add node if it has content
      if (Object.keys(node).length > 0) {
        result[fieldName] = node;
      }
    }
  }

  return result;
}

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
 * Parses GraphQL resolve info into a typed FieldArgsTree for the executor
 *
 * @param info - GraphQL resolve info from resolver
 * @param Type - The TypeClass being resolved (used to determine which fields have children)
 * @returns FieldArgsTree that can be passed to executor.resolve()
 *
 * @example
 * ```ts
 * // In a GraphQL resolver:
 * const argsTree = parseGraphQLInfo(info, ProductView);
 * await executor.resolve(ProductView, productId, argsTree);
 * ```
 */
export function parseGraphQLInfo<T extends TypeClass>(
  info: GraphQLResolveInfo,
  Type: T
): FieldArgsTreeFor<T> {
  const variables = info.variableValues ?? {};
  const fieldsWithChildren = getFieldsWithChildren(Type);

  // Get the first field node (the field being resolved)
  const fieldNode = info.fieldNodes[0];
  if (!fieldNode?.selectionSet) {
    return {} as FieldArgsTreeFor<T>;
  }

  return buildArgsTreeFromSelectionSet(
    fieldNode.selectionSet,
    variables,
    fieldsWithChildren
  ) as FieldArgsTreeFor<T>;
}

/**
 * Recursively collects all fields with children by traversing static fields
 * This version traverses the full type hierarchy to support deeply nested queries
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
      // Recursively collect from child types
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
 * Deep version of parseGraphQLInfo that handles nested types
 * Uses full type hierarchy to determine which fields have children
 */
export function parseGraphQLInfoDeep<T extends TypeClass>(
  info: GraphQLResolveInfo,
  Type: T
): FieldArgsTreeFor<T> {
  const variables = info.variableValues ?? {};
  const fieldsWithChildren = collectAllFieldsWithChildren(Type);

  const fieldNode = info.fieldNodes[0];
  if (!fieldNode?.selectionSet) {
    return {} as FieldArgsTreeFor<T>;
  }

  return buildArgsTreeFromSelectionSet(
    fieldNode.selectionSet,
    variables,
    fieldsWithChildren
  ) as FieldArgsTreeFor<T>;
}
