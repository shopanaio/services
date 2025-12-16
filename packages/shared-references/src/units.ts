/**
 * Weight measurement units
 */
export enum WeightUnit {
  /** Kilogram */
  kg = "kg",
  /** Gram */
  g = "g",
  /** Pound */
  lb = "lb",
  /** Ounce */
  oz = "oz",
}

export const WEIGHT_UNITS = Object.values(WeightUnit);

export interface WeightUnitInfo {
  code: WeightUnit;
  name: string;
  symbol: string;
  /** Conversion factor to grams (base unit) */
  toGrams: number;
}

export const WEIGHT_UNIT_INFO: Record<WeightUnit, WeightUnitInfo> = {
  [WeightUnit.kg]: { code: WeightUnit.kg, name: "Kilogram", symbol: "kg", toGrams: 1000 },
  [WeightUnit.g]: { code: WeightUnit.g, name: "Gram", symbol: "g", toGrams: 1 },
  [WeightUnit.lb]: { code: WeightUnit.lb, name: "Pound", symbol: "lb", toGrams: 453.592 },
  [WeightUnit.oz]: { code: WeightUnit.oz, name: "Ounce", symbol: "oz", toGrams: 28.3495 },
};

/**
 * Dimension (length) measurement units
 */
export enum DimensionUnit {
  /** Millimeter */
  mm = "mm",
  /** Centimeter */
  cm = "cm",
  /** Meter */
  m = "m",
  /** Inch */
  in = "in",
  /** Foot */
  ft = "ft",
}

export const DIMENSION_UNITS = Object.values(DimensionUnit);

export interface DimensionUnitInfo {
  code: DimensionUnit;
  name: string;
  symbol: string;
  /** Conversion factor to millimeters (base unit) */
  toMillimeters: number;
}

export const DIMENSION_UNIT_INFO: Record<DimensionUnit, DimensionUnitInfo> = {
  [DimensionUnit.mm]: { code: DimensionUnit.mm, name: "Millimeter", symbol: "mm", toMillimeters: 1 },
  [DimensionUnit.cm]: { code: DimensionUnit.cm, name: "Centimeter", symbol: "cm", toMillimeters: 10 },
  [DimensionUnit.m]: { code: DimensionUnit.m, name: "Meter", symbol: "m", toMillimeters: 1000 },
  [DimensionUnit.in]: { code: DimensionUnit.in, name: "Inch", symbol: "in", toMillimeters: 25.4 },
  [DimensionUnit.ft]: { code: DimensionUnit.ft, name: "Foot", symbol: "ft", toMillimeters: 304.8 },
};
