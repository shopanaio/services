import type { TypeClass, ExecutorOptions, FieldArgsTreeFor } from "./types.js";

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
 */
export class Executor {
  constructor(private options: ExecutorOptions = {}) {}

  /**
   * Resolves a value through a TypeClass, executing all resolver methods
   * and recursively resolving nested types.
   *
   * @param Type - The TypeClass to use for resolution
   * @param value - The raw value to resolve (typically an ID)
   * @param fieldArgs - Optional typed arguments tree to pass to resolvers
   * @returns The fully resolved object with all fields
   */
  async resolve<T extends TypeClass>(
    Type: T,
    value: ConstructorParameters<T>[0],
    fieldArgs?: FieldArgsTreeFor<T>
  ): Promise<Record<string, unknown>> {
    const instance = new Type(value);
    const fieldsMap = (Type as { fields?: Record<string, () => TypeClass> }).fields ?? {};
    const result: Record<string, unknown> = {};

    // Data is loaded lazily when resolvers access this.data
    const methods = this.getResolverMethods(instance);
    const argsTree = (fieldArgs ?? {}) as Record<
      string,
      { args?: unknown; children?: FieldArgsTreeFor<TypeClass> } | undefined
    >;

    await Promise.all(
      methods.map(async (key) => {
        try {
          const fieldNode = argsTree[key];
          const argsForField = fieldNode && "args" in fieldNode ? fieldNode.args : undefined;

          // Always pass args - methods that don't need them will ignore the parameter
          // Call directly on instance to preserve `this` context
          const resolved = await (instance as Record<string, (args?: unknown) => unknown>)[key](
            argsForField
          );

          const getChildType = fieldsMap[key];

          if (getChildType && resolved != null) {
            const ChildType = getChildType();
            const childArgsTree = fieldNode && "children" in fieldNode ? fieldNode.children : undefined;

            if (Array.isArray(resolved)) {
              result[key] = await Promise.all(
                resolved.map((item) =>
                  this.resolve(
                    ChildType as TypeClass,
                    item as ConstructorParameters<typeof ChildType>[0],
                    childArgsTree as FieldArgsTreeFor<typeof ChildType>
                  )
                )
              );
            } else {
              result[key] = await this.resolve(
                ChildType as TypeClass,
                resolved as ConstructorParameters<typeof ChildType>[0],
                childArgsTree as FieldArgsTreeFor<typeof ChildType>
              );
            }
          } else {
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

    return result;
  }

  /**
   * Resolves an array of values through a TypeClass.
   *
   * @param Type - The TypeClass to use for resolution
   * @param values - Array of raw values to resolve
   * @param fieldArgs - Optional typed arguments tree to pass to resolvers
   * @returns Array of fully resolved objects
   */
  async resolveMany<T extends TypeClass>(
    Type: T,
    values: ConstructorParameters<T>[0][],
    fieldArgs?: FieldArgsTreeFor<T>
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(values.map((value) => this.resolve(Type, value, fieldArgs)));
  }

  /**
   * Gets all resolver methods from a type instance.
   * Excludes constructor, loadData, and internal methods.
   *
   * @param instance - The type instance to extract methods from
   * @returns Array of method names
   */
  private getResolverMethods(instance: object): string[] {
    const excluded = new Set(["constructor", "loadData", "data", "get", "ctx"]);
    const proto = Object.getPrototypeOf(instance);
    return Object.getOwnPropertyNames(proto).filter(
      (key) => !excluded.has(key) && typeof proto[key] === "function"
    );
  }
}

/**
 * Default executor instance for convenience.
 */
export const executor = new Executor();

/**
 * Creates a new executor with custom options.
 *
 * @param options - Configuration options for the executor
 * @returns A new Executor instance
 */
export function createExecutor(options: ExecutorOptions): Executor {
  return new Executor(options);
}
