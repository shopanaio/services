import type {
  FacetReferenceChange,
  ReferenceStatusDelta,
} from "@shopana/events";

export interface FacetReferenceSyncWorkflowInput {
  storeId: string;
  organizationId: string;
  userId?: string;
  trigger:
    | "productCreated"
    | "productUpdated"
    | "productDeleted"
    | "eventBatch"
    | "manual";
  events: FacetReferenceSyncEventInput[];
}

export interface FacetReferenceSyncEventInput {
  eventId: string;
  eventType: string;
  timestamp: string;
  productId?: string;
  variantId?: string;
  refs?: FacetReferenceChange[];
  payload: unknown;
}

export interface FacetReferenceSyncWorkflowResult {
  storeId: string;
  affectedFacetIds: string[];
  affectedFacetValueIds: string[];
  affectedDisplayValueIds: string[];
  sourceStatusChanged: number;
  valueStatusChanged: number;
  emittedEventIds: string[];
}

export type { FacetReferenceChange, ReferenceStatusDelta };
