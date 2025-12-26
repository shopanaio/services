import type { TypeClass } from "../types.js";

const FIELD_TYPE = Symbol("fieldType");

export function Type(getType: () => TypeClass) {
  return function <T extends (...args: any[]) => any>(
    method: T,
    _context: ClassMethodDecoratorContext
  ): T {
    (method as any)[FIELD_TYPE] = getType;
    return method;
  };
}

export function getFieldType(method: unknown): (() => TypeClass) | undefined {
  return (method as any)?.[FIELD_TYPE];
}
