import { Injectable } from "@nestjs/common";
import {
  buildIdempotencyKey,
  BrokerWorkflows,
  hashContent,
  type IdempotencyContext,
  InjectBroker,
  ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";

export type FacetReferenceStateSyncReason =
  | "productCreated"
  | "productUpdated"
  | "productDeleted";

export interface FacetReferenceStateSyncWorkflowInput {
  organizationId: string;
  storeId: string;
  reason: FacetReferenceStateSyncReason;
  productIds?: string[];
  sourceSequence?: number;
  facetIds?: string[];
  checkValues?: boolean;
}

export interface FacetReferenceStateSyncWorkflowResult {
  checkedSourceCount: number;
  staleSourceCount: number;
  checkedValueCount: number;
  staleValueCount: number;
}

@Injectable()
export class FacetReferenceStateSyncWorkflow extends BrokerWorkflows<
  FacetReferenceStateSyncWorkflowInput,
  FacetReferenceStateSyncWorkflowResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("syncFacetReferenceState")
  async run(
    input: FacetReferenceStateSyncWorkflowInput
  ): Promise<FacetReferenceStateSyncWorkflowResult> {
    void input;

    throw new Error("Facet reference state sync workflow is not implemented yet");
  }
}

export function buildFacetReferenceStateSyncWorkflowIdempotencyContext(input: {
  organizationId: string;
  productId: string;
  reason: FacetReferenceStateSyncReason;
  sourceSequence: number;
  eventId: string;
}): IdempotencyContext {
  return {
    source: "content",
    organizationId: input.organizationId,
    resourceId: `product:${input.productId}`,
    operation: `listing.syncFacetReferenceState.${input.reason}`,
    contentHash: hashContent({
      v: 1,
      productId: input.productId,
      reason: input.reason,
      sourceSequence: input.sourceSequence,
      eventId: input.eventId,
    }),
  };
}

export function buildFacetReferenceStateSyncWorkflowId(input: {
  idempotencyCtx: IdempotencyContext;
}): string {
  return buildIdempotencyKey(
    "listing.syncFacetReferenceState",
    input.idempotencyCtx
  );
}

export function buildFacetReferenceStateSyncQueuePartitionKey(input: {
  storeId: string;
  productId: string;
}): string {
  return ["facet-reference-state", input.storeId, "product", input.productId].join(
    ":"
  );
}
