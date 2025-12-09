import type {
  TypeClass,
  ExecutorOptions,
  FieldArgsTreeFor,
  FieldArgsNode,
  TypeResult,
} from "./types.js";
import type { GraphQLResolveInfo } from "graphql";
import { GraphQLObjectType } from "graphql";
import { parseGraphQLInfoDeep } from "./utils/graphqlArgsParser.js";

/**
 * Checks if the given object is a GraphQL resolve info.
 */
function isGraphQLResolveInfo(obj: unknown): obj is GraphQLResolveInfo {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "parentType" in obj &&
    (obj as { parentType: unknown }).parentType instanceof GraphQLObjectType
  );
}

/**
 * Error thrown when a resolver fails.
 * Contains additional context about which field and type failed.
 */
export class ResolverError extends Error {
  readonly field: string;
  readonly type: string;
  readonly originalError?: unknown;

  constructor(
    message: string,
    options: { cause?: unknown; field: string; type: string }
  ) {
    super(message);
    this.name = "ResolverError";
    this.field = options.field;
    this.type = options.type;
    this.originalError = options.cause;
  }
}

/**
 * Executor class for recursive data resolution.
 * Similar to GraphQL resolution but without GraphQL.
 * Uses classes as types where each method is a resolver.
 *
 * When fieldArgs is provided, only requested fields are resolved (like GraphQL).
 * Supports aliases: keys in fieldArgs can be aliases with `fieldName` pointing to the actual method.
 *
 * @template TContext - The type of the context object passed to type instances
 */
export class Executor<TContext = unknown> {
  constructor(private options: ExecutorOptions<TContext> = {}) {}

  /**
   * Resolves a value through a TypeClass, executing resolver methods
   * and recursively resolving nested types.
   *
   * @param Type - The TypeClass to use for resolution
   * @param value - The raw value to resolve (typically an ID)
   * @param fieldArgs - Optional typed arguments tree to pass to resolvers.
   *                    When provided, only requested fields are resolved.
   *                    Keys can be aliases with `fieldName` pointing to the actual method.
   * @returns The fully resolved object with all fields
   */
  async load<T extends TypeClass, TResult = TypeResult<T>>(
    Type: T,
    value: ConstructorParameters<T>[0],
    fieldArgs?: FieldArgsTreeFor<T> | GraphQLResolveInfo
  ): Promise<TResult> {
    const instance = new Type(value, this.options.ctx);
    const fieldsMap =
      (Type as { fields?: Record<string, () => TypeClass> }).fields ?? {};
    const result: Record<string, unknown> = {};

    // Auto-convert GraphQL resolve info to field args tree
    const normalizedFieldArgs = isGraphQLResolveInfo(fieldArgs)
      ? parseGraphQLInfoDeep(fieldArgs, Type)
      : fieldArgs;

    const argsTree = (normalizedFieldArgs ?? {}) as Record<
      string,
      FieldArgsNode | undefined
    >;

    // Only resolve fields that are explicitly requested (like GraphQL)
    // If no fieldArgs provided, return empty object
    const fieldsToResolve = Object.keys(argsTree).filter(
      (key) => argsTree[key] !== undefined
    );

    if (fieldsToResolve.length === 0) {
      return result as TResult;
    }

    await Promise.all(
      fieldsToResolve.map(async (key) => {
        try {
          const fieldNode = argsTree[key];
          // Use fieldName if provided (for aliases), otherwise use the key
          const methodName = fieldNode?.fieldName ?? key;
          const argsForField = fieldNode?.args;

          // Check if this method exists on the instance
          const method = (instance as Record<string, unknown>)[methodName];
          if (typeof method !== "function") {
            // Skip if method doesn't exist (might be an alias for a non-existent field)
            return;
          }

          // Call the resolver method
          const resolved = await (method as (args?: unknown) => unknown).call(
            instance,
            argsForField
          );

          // Get child type using the actual method name, not the alias
          const getChildType = fieldsMap[methodName];

          if (getChildType && resolved != null) {
            const ChildType = getChildType();
            const childArgsTree = fieldNode?.children;

            if (Array.isArray(resolved)) {
              result[key] = await Promise.all(
                resolved.map((item) =>
                  this.load(
                    ChildType as TypeClass,
                    item as ConstructorParameters<typeof ChildType>[0],
                    childArgsTree as FieldArgsTreeFor<typeof ChildType>
                  )
                )
              );
            } else {
              result[key] = await this.load(
                ChildType as TypeClass,
                resolved as ConstructorParameters<typeof ChildType>[0],
                childArgsTree as FieldArgsTreeFor<typeof ChildType>
              );
            }
          } else {
            // Store result under the key (which may be an alias)
            result[key] = resolved;
          }
        } catch (error) {
          switch (this.options.onError) {
            case "null":
              result[key] = null;
              break;
            case "partial":
              result[key] = { __error: (error as Error).message };
              break;
            case "throw":
            default:
              throw new ResolverError(
                `Failed to resolve field "${key}" on ${Type.name}`,
                { cause: error, field: key, type: Type.name }
              );
          }
        }
      })
    );

    return result as TResult;
  }

  /**
   * Resolves an array of values through a TypeClass.
   */
  async loadMany<T extends TypeClass, TResult = TypeResult<T>>(
    Type: T,
    values: ConstructorParameters<T>[0][],
    fieldArgs?: FieldArgsTreeFor<T> | GraphQLResolveInfo
  ): Promise<TResult[]> {
    const normalizedFieldArgs = isGraphQLResolveInfo(fieldArgs)
      ? parseGraphQLInfoDeep(fieldArgs, Type)
      : fieldArgs;

    return Promise.all(
      values.map((value) =>
        this.load<T, TResult>(Type, value, normalizedFieldArgs)
      )
    );
  }
}

/**
 * Creates a new executor with custom options.
 *
 * @template TContext - The type of the context object
 * @param options - Configuration options for the executor
 * @returns A new Executor instance
 */
export function createExecutor<TContext = unknown>(
  options: ExecutorOptions<TContext>
): Executor<TContext> {
  return new Executor(options);
}

/**
 * Load and resolve a value through a TypeClass.
 *
 * @param Type - The TypeClass to use for resolution
 * @param value - The raw value to resolve
 * @param fieldArgs - Optional field arguments or GraphQL resolve info
 * @param ctx - Context object to pass to type instances
 */
export function load<
  T extends TypeClass,
  TResult = TypeResult<T>,
  TContext = unknown
>(
  Type: T,
  value: ConstructorParameters<T>[0],
  fieldArgs: FieldArgsTreeFor<T> | GraphQLResolveInfo | undefined,
  ctx: TContext
): Promise<TResult> {
  const exec = new Executor({ ctx });
  return exec.load<T, TResult>(Type, value, fieldArgs);
}

/**
 * Load and resolve multiple values through a TypeClass.
 *
 * @param Type - The TypeClass to use for resolution
 * @param values - The raw values to resolve
 * @param fieldArgs - Optional field arguments or GraphQL resolve info
 * @param ctx - Context object to pass to type instances
 */
export function loadMany<
  T extends TypeClass,
  TResult = TypeResult<T>,
  TContext = unknown
>(
  Type: T,
  values: ConstructorParameters<T>[0][],
  fieldArgs: FieldArgsTreeFor<T> | GraphQLResolveInfo | undefined,
  ctx: TContext
): Promise<TResult[]> {
  const exec = new Executor({ ctx });
  return exec.loadMany<T, TResult>(Type, values, fieldArgs);
}
