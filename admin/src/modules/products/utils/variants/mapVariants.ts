import { IProductFormVariantValues } from '@modules/products/types';
import { IProductOption } from '@src/entity/Product/ProductFeature';
import { mapEntryId } from '@src/utils/utils';

function getCombinations(
  arrays: ID[][],
  result: ID[][] = [],
  index = 0,
  current: ID[] = [],
): ID[][] {
  if (index === arrays.length) {
    result.push([...current]);
    return [];
  }

  for (let i = 0; i < arrays[index].length; i++) {
    current[index] = arrays[index][i];
    getCombinations(arrays, result, index + 1, current);
  }

  return result;
}

export function finalVariantsSort(
  active: IProductFormVariantValues[],
  options: IProductOption[],
) {
  const sortedCombinations = getCombinations(
    options.map((group) => {
      return group.features.map((f) => f.id);
    }),
  );

  return sortedCombinations
    .map((combination) => {
      const id = combination.sort().join('.');

      const variant = active.find((it) => {
        return it.options.map(mapEntryId).sort().join('.') === id;
      });

      return variant || null;
    })
    .filter(Boolean) as IProductFormVariantValues[];
}
