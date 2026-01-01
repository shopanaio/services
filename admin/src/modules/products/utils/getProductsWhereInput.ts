import { getWhereInput } from '@components/filters/UiFilterWidget/getWhereInput';
import { UiFilter } from '@src/entity/UiFilter';
import { ITableNavigationProps } from '@src/layouts/table/components/Navigation/Navigation';

export const getProductsWhereInput = (
  props: Pick<
    ITableNavigationProps,
    'searchProps' | 'filtersProps' | 'localesProps' | 'sortProps'
  >,
) => {
  return getWhereInput({
    ...props,
    locale: props.localesProps.locale,
    sortProps: props.sortProps,
    searchProperties: [
      { key: 'title', type: UiFilter.UiFilterType.Translatable },
    ],
  });
};
