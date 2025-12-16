import type { WeightUnit, DimensionUnit } from "../../../repositories/models/index.js";
import type { ProjectPayload } from "./shared.js";

export interface ProjectUpdateParams {
  id: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  timezone?: string;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export type ProjectUpdateResult = ProjectPayload;
