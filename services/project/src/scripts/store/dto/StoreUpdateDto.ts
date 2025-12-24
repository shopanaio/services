import type { WeightUnit, DimensionUnit } from "../../../repositories/models/index.js";
import type { StorePayload } from "./shared.js";

export interface StoreUpdateParams {
  id: string;
  name?: string;
  email?: string;
  timezone?: string;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export type StoreUpdateResult = StorePayload;
