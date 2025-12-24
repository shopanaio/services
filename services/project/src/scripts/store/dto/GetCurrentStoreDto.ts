import type { StorePayload } from "./shared.js";

export interface GetCurrentStoreParams {
  /** Store slug */
  slug: string;
}

export interface GetCurrentStoreResult extends StorePayload {}
