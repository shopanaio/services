import { ISublistingOption } from '@modules/categories/types';
import { ApiCreateSublistingInput } from '@src/graphql';

export const mapApiSublisting = (
  item: ISublistingOption,
): ApiCreateSublistingInput => {
  return {
    entryId: item.id,
    placement: item.placement,
    type: 'category',
  };
};
