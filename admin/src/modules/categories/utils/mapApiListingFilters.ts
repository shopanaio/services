import { FilterValueType } from '@src/entity/Filter/enums';
import { IFilter } from '@src/entity/Filter/types';
import { sanitizeEntries } from '@src/entity/utils';
import {
  ApiCreateListingFilterInput,
  ApiListingFilterInput,
  FilterType,
} from '@src/graphql';
import { mapEntryId } from '@src/utils/utils';

export const mapApiListingFilter = (
  condition: IFilter,
  idx: number,
): ApiCreateListingFilterInput[] => {
  if (
    !condition.operator ||
    !condition.value ||
    !condition.type ||
    !condition.valueType
  ) {
    return [];
  }

  const mapFilter = (value: any, valueIdx: number) => ({
    operator: condition.operator.value,
    path: `${idx}.${valueIdx}`,
    type: condition.type,
    ...(condition.valueType === FilterValueType.Relation
      ? { entryID: value.id as ID, value: '' }
      : { value, entryID: null }),
  });

  if (Array.isArray(condition.value)) {
    return condition.value.map(mapFilter);
  }

  return [mapFilter(condition.value, 0)];
};

export const getApiListingFilters = (
  conditions: IFilter[],
): ApiListingFilterInput[] => {
  const result = [];

  const getRelationFilter = (condition: IFilter) => {
    return {
      type: condition.type,
      values: (Array.isArray(condition.value)
        ? condition.value
        : [condition.value]
      ).map(mapEntryId),
    };
  };

  const mapping = {
    [FilterType.Price]: [] as any[],
    [FilterType.Category]: [] as any[],
    [FilterType.Tag]: [] as any[],
    [FilterType.Feature]: [] as any[],
    [FilterType.Availability]: [] as any[],
  };

  conditions.forEach((condition) => {
    if (!mapping[condition.type]) {
      return;
    }

    mapping[condition.type].push(condition);
  });

  if (mapping[FilterType.Availability].length > 0) {
    result.push(
      ...mapping[FilterType.Availability].map((it) => ({
        type: FilterType.Availability,
        values: sanitizeEntries(
          Array.isArray(it.value) ? it.value : [it.value],
        ),
      })),
    );
  }

  if (mapping[FilterType.Price].length > 0) {
    result.push(
      ...mapping[FilterType.Price].map((it) => ({
        type: FilterType.Price,
        values: it.value,
      })),
    );
  }

  if (mapping[FilterType.Category].length > 0) {
    result.push(...mapping[FilterType.Category].map(getRelationFilter));
  }

  if (mapping[FilterType.Feature].length > 0) {
    result.push(...mapping[FilterType.Feature].map(getRelationFilter));
  }

  if (mapping[FilterType.Tag].length > 0) {
    result.push(...mapping[FilterType.Tag].map(getRelationFilter));
  }

  return result;
};
