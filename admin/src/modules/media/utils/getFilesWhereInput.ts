import { getWhereInput } from '@components/filters/UiFilterWidget/getWhereInput';
import { UiFilter } from '@src/entity/UiFilter';
import { ITableNavigationProps } from '@src/layouts/table/components/Navigation/Navigation';

export const getFilesWhereInput = (
  props: Pick<
    ITableNavigationProps,
    'sortProps' | 'filtersProps' | 'localesProps' | 'searchProps'
  >,
) => {
  return getWhereInput({
    ...props,
    locale: props.localesProps.locale,
    sortProps: props.sortProps,
    searchProperties: [
      {
        key: 'name',
        type: UiFilter.UiFilterType.String,
      },
    ],
  });
};
