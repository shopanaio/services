import { IFilterSchema } from '../core/types';

/**
 * Find a filter schema by key path
 * Supports nested filters through children
 */
export const findFilter = (
  keyPath: string[],
  schemas: IFilterSchema[] = [],
): IFilterSchema | null => {
  if (!keyPath.length || !schemas.length) {
    return null;
  }

  const [key, ...rest] = keyPath;
  const schema = schemas.find((s) => s.key === key);

  if (!schema) {
    return null;
  }

  if (rest.length) {
    if (!schema.children?.length) {
      return null;
    }
    return findFilter(rest, schema.children);
  }

  return schema;
};

/**
 * Find a filter schema by payload key
 */
export const findFilterByPayloadKey = (
  payloadKey: string,
  schemas: IFilterSchema[],
): IFilterSchema | null => {
  for (const schema of schemas) {
    if (schema.payloadKey === payloadKey) {
      return schema;
    }
    if (schema.children?.length) {
      const found = findFilterByPayloadKey(payloadKey, schema.children);
      if (found) return found;
    }
  }
  return null;
};
