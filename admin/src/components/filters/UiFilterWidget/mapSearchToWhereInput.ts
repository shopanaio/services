import { UiFilter } from '@src/entity/UiFilter';

type GenericWhereInput = Record<string, any>;

const { ILike, Eq } = UiFilter.UiFilterOperator;
const {
  String: StringType,
  Integer: IntegerType,
  Number: NumberType,
  Translatable,
} = UiFilter.UiFilterType;

const operatorByType = {
  [Translatable]: ILike,
  [StringType]: ILike,
  [IntegerType]: Eq,
  [NumberType]: Eq,
};

export const mapSearchToWhereInput = (
  value: string,
  payloadKeys: UiFilter.IUiFilterSearchProperty[],
) => {
  const filters = payloadKeys
    .filter((it) => {
      if (it.type === IntegerType) {
        return !Number.isNaN(parseInt(value, 10));
      }

      if (it.type === NumberType) {
        return !isNaN(parseFloat(value));
      }

      return true;
    })
    .map(({ key, type }) => {
      const initialFilter = { [operatorByType[type]]: value };

      const payloadKeyPath = key.split('.');

      return payloadKeyPath.reduceRight((acc, key) => {
        return { [key]: acc };
      }, initialFilter as GenericWhereInput);
    }, {});

  return {
    Or: filters,
  };
};
