import type { StorePayload } from "./shared.js";

export interface GetCurrentStoreParams {
  /** Store name (URL-friendly identifier) */
  name: string;
}

export interface GetCurrentStoreResult extends StorePayload {}
