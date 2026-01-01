import { UiFilter } from '@src/entity/UiFilter';
import dayjs from 'dayjs';

const { Eq, NotEq, Between, In, NotIn, Gte, Lt } = UiFilter.UiFilterOperator;
const { Relation, Date } = UiFilter.UiFilterType;

export type GenericWhereInput = Record<string, any>;

const isMultipleValue = (op: UiFilter.UiFilterOperator) =>
  [In, NotIn].includes(op);

const mapFilterToWhereInput = (valueRecord: UiFilter.IUiFilterValue) => {
  if (!valueRecord || !valueRecord.payloadKey || !valueRecord.value) {
    return null;
  }

  const isArrayValue = Array.isArray(valueRecord.value);
  const isMultiple = isMultipleValue(valueRecord.operator);

  const hasValue = isArrayValue
    ? valueRecord.value?.length > 0
    : valueRecord.value !== null &&
      valueRecord.value !== undefined &&
      valueRecord.value !== '';

  if (!hasValue) {
    return null;
  }

  const mapValue = (value: any) => {
    if (valueRecord.type === Relation) {
      if (Number.isInteger(value)) {
        return value;
      }

      return value.id;
    }

    return value;
  };

  const value = isArrayValue
    ? isMultiple
      ? valueRecord.value.map(mapValue)
      : mapValue(valueRecord.value[0])
    : mapValue(valueRecord.value);

  const payloadKeyPath = valueRecord.payloadKey.split('.');

  const initialFilter = {
    [valueRecord.operator]: value,
  };

  return payloadKeyPath.reduceRight((acc, key) => {
    return { [key]: acc };
  }, initialFilter);
};

export const mapFiltersToWhereInput = (
  valueRecords: UiFilter.IUiFilterValue[],
) => {
  return valueRecords.flatMap((valueRecord) => {
    if (valueRecord.type === Date) {
      let startDate: GenericWhereInput | null = null;
      let endDate: GenericWhereInput | null = null;

      if ([Eq, NotEq].includes(valueRecord.operator)) {
        const date = valueRecord.value?.[0];
        if (!dayjs.isDayjs(date)) {
          return [];
        }

        startDate = mapFilterToWhereInput({
          ...valueRecord,
          operator: Gte,
        });

        endDate = mapFilterToWhereInput({
          ...valueRecord,
          operator: Lt,
          value: [dayjs(date).add(1, 'day').toDate()],
        });

        if (!startDate || !endDate) {
          return [];
        }

        return [startDate, endDate];
      }

      if (valueRecord.operator === Between) {
        const [from, to] = valueRecord.value || [];
        if (!dayjs.isDayjs(from) || !dayjs.isDayjs(to)) {
          return [];
        }

        startDate = mapFilterToWhereInput({
          ...valueRecord,
          operator: Gte,
          value: [from],
        });

        endDate = mapFilterToWhereInput({
          ...valueRecord,
          operator: Lt,
          value: [to],
        });

        if (!startDate || !endDate) {
          return [];
        }

        return [startDate, endDate];
      }
    }

    const whereRecord = mapFilterToWhereInput(valueRecord);
    if (!whereRecord) {
      return [];
    }

    return [whereRecord];
  });
};
