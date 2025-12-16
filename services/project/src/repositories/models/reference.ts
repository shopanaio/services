import { pgSchema } from "drizzle-orm/pg-core";
import {
  WeightUnit as WeightUnitEnum,
  DimensionUnit as DimensionUnitEnum,
  WEIGHT_UNITS,
  DIMENSION_UNITS,
} from "@shopana/shared-references";

export const referenceSchema = pgSchema("reference");

export const weightUnitEnum = referenceSchema.enum(
  "weight_unit",
  WEIGHT_UNITS as [string, ...string[]]
);

export const dimensionUnitEnum = referenceSchema.enum(
  "dimension_unit",
  DIMENSION_UNITS as [string, ...string[]]
);

export type WeightUnit = WeightUnitEnum;
export type DimensionUnit = DimensionUnitEnum;

export { WeightUnitEnum, DimensionUnitEnum, WEIGHT_UNITS, DIMENSION_UNITS };
