import { UiFilter } from '@src/entity/UiFilter';

export const findFilter = (
  keys: string[],
  filters: UiFilter.IUiFilter[] = [],
): UiFilter.IUiFilter | null => {
  const [key, ...rest] = keys;
  const filter = filters.find((it) => it.key === key);

  if (!filter) {
    return null;
  }

  if (rest.length) {
    if (!filter.children?.length) {
      return null;
    }

    return findFilter(rest, filter.children);
  }

  return filter;
};
