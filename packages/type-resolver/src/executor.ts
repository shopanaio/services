import type {
  ExecutorOptions,
  QueryArgs,
  TypeClass,
  TypeResult,
} from "./types.js";

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
 * When query is provided, only requested fields are resolved (like GraphQL).
 * Supports aliases via `fieldName` property in populate entries.
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
   * @param query - Optional QueryArgs specifying which fields to resolve.
   *                When provided, only requested fields are resolved.
   * @returns The fully resolved object with all fields
   */
  async load<T extends TypeClass, TResult = TypeResult<T>>(
    Type: T,
    value: ConstructorParameters<T>[0],
    query?: QueryArgs
  ): Promise<TResult> {
    const instance = new Type(value, this.options.ctx);

    // Check if loadData returns null - if so, return null immediately
    if (typeof (instance as any).loadData === "function") {
      const data = await (instance as any).loadData();
      if (data === null || data === undefined) {
        return null as TResult;
      }
    }

    const fieldsMap =
      (Type as { fields?: Record<string, () => TypeClass> }).fields ?? {};
    const result: Record<string, unknown> = {};

    // Collect all fields to resolve
    const fieldsToResolve = new Set<string>();

    // 1. Add scalar fields from fields array
    if (query?.fields) {
      for (const field of query.fields) {
        fieldsToResolve.add(field);
      }
    }

    // 2. Add relation fields from populate
    if (query?.populate) {
      for (const field of Object.keys(query.populate)) {
        fieldsToResolve.add(field);
      }
    }

    // 3. If query is not specified - resolve ALL methods (backwards compat)
    if (!query) {
      const prototype = Object.getPrototypeOf(instance);
      for (const key of Object.getOwnPropertyNames(prototype)) {
        if (key !== "constructor" && key !== "loadData" && key !== "get") {
          if (typeof (instance as any)[key] === "function") {
            fieldsToResolve.add(key);
          }
        }
      }
    }

    // Resolve fields
    await Promise.all(
      Array.from(fieldsToResolve).map(async (key) => {
        try {
          // Get config for field from populate (if exists)
          const fieldQuery = query?.populate?.[key];

          // Alias support: fieldName specifies the real method
          const methodName = fieldQuery?.fieldName ?? key;

          // Args for method
          const argsForField = fieldQuery?.args;

          const method = (instance as any)[methodName];
          if (typeof method !== "function") return;

          // Call resolver method
          const resolved = await method.call(instance, argsForField);

          // Check if there is a child type for this field
          const getChildType = fieldsMap[methodName];

          if (getChildType && resolved != null && fieldQuery) {
            // Relation field - recursively resolve with child query
            const ChildType = getChildType();

            if (Array.isArray(resolved)) {
              result[key] = await Promise.all(
                resolved.map((item) => this.load(ChildType, item, fieldQuery))
              );
            } else {
              result[key] = await this.load(ChildType, resolved, fieldQuery);
            }
          } else {
            // Scalar field or relation without query
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
    query?: QueryArgs
  ): Promise<TResult[]> {
    return Promise.all(
      values.map((value) => this.load<T, TResult>(Type, value, query))
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
 * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
 * @param ctx - Context object to pass to type instances
 */
export function load<
  T extends TypeClass,
  TResult = TypeResult<T>,
  TContext = unknown
>(
  Type: T,
  value: ConstructorParameters<T>[0],
  query: QueryArgs | undefined,
  ctx: TContext
): Promise<TResult> {
  const exec = new Executor({ ctx });
  return exec.load<T, TResult>(Type, value, query);
}

/**
 * Load and resolve multiple values through a TypeClass.
 *
 * @param Type - The TypeClass to use for resolution
 * @param values - The raw values to resolve
 * @param query - Optional QueryArgs (use parseGraphqlInfo to convert from GraphQL info)
 * @param ctx - Context object to pass to type instances
 */
export function loadMany<
  T extends TypeClass,
  TResult = TypeResult<T>,
  TContext = unknown
>(
  Type: T,
  values: ConstructorParameters<T>[0][],
  query: QueryArgs | undefined,
  ctx: TContext
): Promise<TResult[]> {
  const exec = new Executor({ ctx });
  return exec.loadMany<T, TResult>(Type, values, query);
}
