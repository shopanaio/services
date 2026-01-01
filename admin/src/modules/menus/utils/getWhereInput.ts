import { getWhereInput } from '@components/filters/UiFilterWidget/getWhereInput';
import { UiFilter } from '@src/entity/UiFilter';
import { ApiMenusWhereInput } from '@src/graphql';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { ISearchProps } from '@src/layouts/table/hooks/useSearch';
import { ILocalesProps } from '@src/layouts/table/components/Navigation/Navigation';
import { ISortByProps } from '@src/layouts/table/components/Navigation/SortBy';

export const getMenusWhereInput = (
  props: {
    filtersProps: IFiltersProps;
    searchProps: ISearchProps;
    localesProps: ILocalesProps;
    sortProps: ISortByProps;
  },
  whereInput?: ApiMenusWhereInput[],
) => {
  return getWhereInput({
    ...props,
    searchProperties: [
      { key: 'title', type: UiFilter.UiFilterType.Translatable },
    ],
    sortProps: props.sortProps,
    whereInput,
  });
};
