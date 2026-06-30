import { DimensionUnit, WeightUnit } from "@/graphql/types";

export const weightUnitOptions = {
  [WeightUnit.G]: {
    key: WeightUnit.G,
    label: 'g',
  },
  [WeightUnit.Kg]: {
    key: WeightUnit.Kg,
    label: 'kg',
  },
  [WeightUnit.Oz]: {
    key: WeightUnit.Oz,
    label: 'oz',
  },
  [WeightUnit.Lb]: {
    key: WeightUnit.Lb,
    label: 'lb',
  },
};

export const dimensionUnitOptions = {
  [DimensionUnit.Mm]: {
    key: DimensionUnit.Mm,
    label: 'mm',
  },
  [DimensionUnit.Cm]: {
    key: DimensionUnit.Cm,
    label: 'cm',
  },
  [DimensionUnit.M]: {
    key: DimensionUnit.M,
    label: 'm',
  },
  [DimensionUnit.In]: {
    key: DimensionUnit.In,
    label: 'in',
  },
};
