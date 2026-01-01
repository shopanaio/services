import {
  GenericWhereInput,
  mapFiltersToWhereInput,
} from '@components/filters/UiFilterWidget/maoFiltersToWhereInput';
import { UiFilter } from '@src/entity/UiFilter';
import { TranslationField } from '@src/graphql';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { ISortByProps } from '@src/layouts/table/components/Navigation/SortBy';
import { ISearchProps } from '@src/layouts/table/hooks/useSearch';

export const getWhereInput = ({
  filtersProps,
  searchProps,
  whereInput = [],
  searchProperties,
}: {
  filtersProps: IFiltersProps;
  searchProps: ISearchProps;
  searchProperties: UiFilter.IUiFilterSearchProperty[];
  sortProps: ISortByProps;
  whereInput?: GenericWhereInput[];
}) => {
  const { derivedValue } = searchProps;
  const { value } = filtersProps;

  const where = {
    And: [...whereInput] as GenericWhereInput[],
  };

  const filtersWhereInputs = mapFiltersToWhereInput(value);
  if (filtersWhereInputs.length > 0) {
    where.And.push(...(filtersWhereInputs as GenericWhereInput[]));
  }

  const [searchProperty] = searchProperties || [];

  if (searchProperty && derivedValue.length) {
    where.And.push(
      ...mapFiltersToWhereInput([
        {
          payloadKey: searchProperty.key,
          label: '',
          operator: UiFilter.UiFilterOperator.ILike,
          type: UiFilter.UiFilterType.String,
          value: [derivedValue],
          keyPath: [],
        },
        ...(searchProperty.type === UiFilter.UiFilterType.Translatable
          ? [
              {
                payloadKey: 'translationField',
                label: '',
                operator: UiFilter.UiFilterOperator.Eq,
                type: UiFilter.UiFilterType.String,
                value: [TranslationField.Title],
                keyPath: [],
              },
            ]
          : []),
      ]),
    );
  }

  return where;
};
