import { mapEntryId } from '@src/utils/utils';
import { isEqual } from 'lodash';

export const getDirtyVariantFields = <T extends { id: ID }>(
  initial: T,
  current: T,
) => {
  return Object.entries(current).reduce((acc, [key, value]) => {
    if (key === 'options' && Array.isArray(value)) {
      // @ts-expect-error ...
      const initialOptions = (initial[key] || []).map(mapEntryId);
      const currentOptions = value.map(mapEntryId);

      if (!isEqual(initialOptions, currentOptions)) {
        acc[key] = true;
      }
    }
    // @ts-expect-error ...
    else if (!isEqual(value, initial[key])) {
      acc[key] = true;
    }

    return acc;
  }, {} as any);
};
