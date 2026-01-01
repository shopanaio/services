import { IProductVariantOption } from '@src/entity/Product/Variant';

export function createVariantsByOptions(
  options: IProductVariantOption[],
): { options: IProductVariantOption[]; id: string }[] {
  if (!options?.length) {
    return [];
  }

  const groupedOptions: { [groupId: string]: IProductVariantOption[] } =
    options.reduce(
      (acc, it) => {
        if (!it.group) {
          console.warn('No group for option', it);
          return acc;
        }

        return {
          ...acc,
          [it.group.id]: [...(acc[it.group.id] || []), it],
        };
      },
      {} as Record<string, IProductVariantOption[]>,
    );

  let result: IProductVariantOption[][] = [[]];

  for (const arr of Object.values(groupedOptions)) {
    const temp: IProductVariantOption[][] = [];
    for (const res of result) {
      for (const item of arr) {
        temp.push([...res, item]);
      }
    }

    result = temp;
  }

  return result
    .map((options) => {
      return {
        options,
        id: options
          .map((it) => it.id)
          .sort()
          .join(','),
      };
    })
    .sort((a, b) => {
      if (a.id < b.id) {
        return 1;
      }
      if (a.id > b.id) {
        return -1;
      }
      return 0;
    });
}
