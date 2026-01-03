import { WeightUnit, DimensionUnit } from './mocks/types';

export const weightUnitOptions = {
  [WeightUnit.G]: {
    key: WeightUnit.G,
    label: 'g',
  },
  [WeightUnit.KG]: {
    key: WeightUnit.KG,
    label: 'kg',
  },
  [WeightUnit.OZ]: {
    key: WeightUnit.OZ,
    label: 'oz',
  },
  [WeightUnit.LB]: {
    key: WeightUnit.LB,
    label: 'lb',
  },
};

export const dimensionUnitOptions = {
  [DimensionUnit.MM]: {
    key: DimensionUnit.MM,
    label: 'mm',
  },
  [DimensionUnit.CM]: {
    key: DimensionUnit.CM,
    label: 'cm',
  },
  [DimensionUnit.M]: {
    key: DimensionUnit.M,
    label: 'm',
  },
  [DimensionUnit.IN]: {
    key: DimensionUnit.IN,
    label: 'in',
  },
};
