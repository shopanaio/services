import type { TypeClass } from "../types.js";

const FIELD_TYPE = Symbol("fieldType");

/**
 * Method decorator that marks a resolver method as returning a specific type.
 * Used for type resolution in GraphQL field resolvers.
 *
 * @example
 * ```typescript
 * class ProductResolver extends BaseResolver<string, Product> {
 *   @Type(() => VariantResolver)
 *   variants() {
 *     return this.get("variantIds");
 *   }
 * }
 * ```
 */
export function Type(getType: () => TypeClass) {
  return function <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    (descriptor.value as any)[FIELD_TYPE] = getType;
    return descriptor;
  };
}

export function getFieldType(method: unknown): (() => TypeClass) | undefined {
  return (method as any)?.[FIELD_TYPE];
}
