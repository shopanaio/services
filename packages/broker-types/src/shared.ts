/**
 * Common types shared across broker actions and events
 */

/** Reference to an entity in another service */
export interface EntityRef {
  service: string;
  entityType: string;
  entityId: string;
}

/** Standard user error format */
export interface UserError {
  field: string[];
  message: string;
}

/** Asset owner types */
export type AssetOwnerType = "organization" | "store";
