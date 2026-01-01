import { getWhereInput } from '@components/filters/UiFilterWidget/getWhereInput';
import { UiFilter } from '@src/entity/UiFilter';
import { ApiCategoriesWhereInput } from '@src/graphql';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { ILocalesProps } from '@src/layouts/table/components/Navigation/Navigation';
import { ISearchProps } from '@src/layouts/table/hooks/useSearch';

export const getCategoriesWhereInput = (
  props: {
    filtersProps: IFiltersProps;
    searchProps: ISearchProps;
    localesProps: ILocalesProps;
  },
  whereInput?: ApiCategoriesWhereInput[],
) => {
  return getWhereInput({
    ...props,
    locale: props.localesProps.locale,
    whereInput,
    searchProperties: [
      { key: 'title', type: UiFilter.UiFilterType.Translatable },
    ],
  });
};
