import { DimensionUnit, WeightUnit } from "@/graphql/types";
import type { ApiVariantDimensions, ApiVariantWeight } from "@/graphql/types";

export interface VariantWeightFields {
  weight: number | null;
  weightUnit: WeightUnit;
}

export interface VariantDimensionFields {
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: DimensionUnit;
}

export const DEFAULT_WEIGHT_UNIT = WeightUnit.G;
export const DEFAULT_DIMENSION_UNIT = DimensionUnit.Mm;

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  [WeightUnit.G]: "g",
  [WeightUnit.Kg]: "kg",
  [WeightUnit.Lb]: "lb",
  [WeightUnit.Oz]: "oz",
};

export const DIMENSION_UNIT_LABELS: Record<DimensionUnit, string> = {
  [DimensionUnit.Cm]: "cm",
  [DimensionUnit.Ft]: "ft",
  [DimensionUnit.In]: "in",
  [DimensionUnit.M]: "m",
  [DimensionUnit.Mm]: "mm",
};

export const getWeightUnitLabel = (
  unit: string | null | undefined,
): string => {
  if (!unit) {
    return WEIGHT_UNIT_LABELS[DEFAULT_WEIGHT_UNIT];
  }

  return WEIGHT_UNIT_LABELS[unit as WeightUnit] ?? unit;
};

export const getDimensionUnitLabel = (
  unit: string | null | undefined,
): string => {
  if (!unit) {
    return DIMENSION_UNIT_LABELS[DEFAULT_DIMENSION_UNIT];
  }

  return DIMENSION_UNIT_LABELS[unit as DimensionUnit] ?? unit;
};

const formatMeasurement = (value: number): string =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");

const convertWeightFromGrams = (
  weightGrams: number,
  unit: WeightUnit,
): number => {
  switch (unit) {
    case WeightUnit.Kg:
      return weightGrams / 1000;
    case WeightUnit.Lb:
      return weightGrams / 453.59237;
    case WeightUnit.Oz:
      return weightGrams / 28.349523125;
    case WeightUnit.G:
    default:
      return weightGrams;
  }
};

const convertDimensionFromMillimeters = (
  valueMm: number,
  unit: DimensionUnit,
): number => {
  switch (unit) {
    case DimensionUnit.Cm:
      return valueMm / 10;
    case DimensionUnit.M:
      return valueMm / 1000;
    case DimensionUnit.In:
      return valueMm / 25.4;
    case DimensionUnit.Ft:
      return valueMm / 304.8;
    case DimensionUnit.Mm:
    default:
      return valueMm;
  }
};

export const mapApiWeightToVariantFields = (
  weight: ApiVariantWeight | null | undefined,
): VariantWeightFields => ({
  weight: weight?.value ?? null,
  weightUnit: DEFAULT_WEIGHT_UNIT,
});

export const mapApiDimensionsToVariantFields = (
  dimensions: ApiVariantDimensions | null | undefined,
): VariantDimensionFields => ({
  length: dimensions?.length ?? null,
  width: dimensions?.width ?? null,
  height: dimensions?.height ?? null,
  dimensionUnit: DEFAULT_DIMENSION_UNIT,
});

export const formatApiWeight = (
  weight: ApiVariantWeight | null | undefined,
): string => {
  if (!weight) {
    return "-";
  }

  const value = convertWeightFromGrams(weight.value, DEFAULT_WEIGHT_UNIT);

  return `${formatMeasurement(value)} ${getWeightUnitLabel(DEFAULT_WEIGHT_UNIT)}`;
};

export const formatApiDimensions = (
  dimensions: ApiVariantDimensions | null | undefined,
): string => {
  if (!dimensions) {
    return "-";
  }

  const unit = DEFAULT_DIMENSION_UNIT;
  const values = [
    convertDimensionFromMillimeters(dimensions.length, unit),
    convertDimensionFromMillimeters(dimensions.width, unit),
    convertDimensionFromMillimeters(dimensions.height, unit),
  ].map(formatMeasurement);

  return `${values.join(" x ")} ${getDimensionUnitLabel(unit)}`;
};
