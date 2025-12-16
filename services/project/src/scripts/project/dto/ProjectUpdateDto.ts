import type { WeightUnit, UnitSystem } from "../../../repositories/models/index.js";
import type { ProjectPayload } from "./shared.js";

export interface ProjectUpdateParams {
  id: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  country?: string;
  timezone?: string;
  weightUnit?: WeightUnit;
  unitSystem?: UnitSystem;
}

export type ProjectUpdateResult = ProjectPayload;
