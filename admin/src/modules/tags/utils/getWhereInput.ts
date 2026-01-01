import { getWhereInput } from '@components/filters/UiFilterWidget/getWhereInput';
import { UiFilter } from '@src/entity/UiFilter';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { ISearchProps } from '@src/layouts/table/hooks/useSearch';
import { ILocalesProps } from '@src/layouts/table/components/Navigation/Navigation';

export const getTagsWhereInput = (props: {
  filtersProps: IFiltersProps;
  searchProps: ISearchProps;
  localesProps: ILocalesProps;
}) => {
  return getWhereInput({
    ...props,
    locale: props.localesProps.locale,
    searchProperties: [
      { key: 'title', type: UiFilter.UiFilterType.Translatable },
    ],
  });
};
