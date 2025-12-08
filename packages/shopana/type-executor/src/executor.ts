import type { TypeClass, ExecutorOptions } from "./types.js";

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
   * @param value - The raw value to resolve
   * @returns The fully resolved object with all fields
   */
  async resolve<T>(Type: TypeClass<T>, value: T): Promise<Record<string, unknown>> {
    const instance = new Type(value);
    const fields = (Type as { fields?: Record<string, () => TypeClass> }).fields || {};
    const result: Record<string, unknown> = {};

    const methods = this.getResolverMethods(instance);

    await Promise.all(
      methods.map(async (key) => {
        try {
          const resolved = await (instance as Record<string, () => unknown>)[key]();
          const getChildType = fields[key];

          if (getChildType && resolved != null) {
            const ChildType = getChildType();

            if (Array.isArray(resolved)) {
              result[key] = await Promise.all(
                resolved.map((item) => this.resolve(ChildType, item))
              );
            } else {
              result[key] = await this.resolve(ChildType, resolved);
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
              throw error;
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
   * @returns Array of fully resolved objects
   */
  async resolveMany<T>(
    Type: TypeClass<T>,
    values: T[]
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(values.map((value) => this.resolve(Type, value)));
  }

  /**
   * Gets all resolver methods from a type instance.
   * Excludes the constructor and non-function properties.
   *
   * @param instance - The type instance to extract methods from
   * @returns Array of method names
   */
  private getResolverMethods(instance: object): string[] {
    const proto = Object.getPrototypeOf(instance);
    return Object.getOwnPropertyNames(proto).filter(
      (key) => key !== "constructor" && typeof proto[key] === "function"
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
