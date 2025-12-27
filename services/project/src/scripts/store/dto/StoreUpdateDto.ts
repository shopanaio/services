import type {
  WeightUnit,
  DimensionUnit,
} from "../../../repositories/models/index.js";
import type { StorePayload } from "./shared.js";

export interface StoreUpdateParams {
  id: string;
  /** Organization name (e.g., "my-org") */
  organizationId: string;
  /** Store name (e.g., "my-store") */
  name?: string;
  /** Human-readable display name update */
  displayName?: string;
  email?: string;
  timezone?: string;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export type StoreUpdateResult = StorePayload;
