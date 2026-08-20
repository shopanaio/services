import { DBOS, type ServiceBroker } from "@shopana/shared-kernel";
import type { ListingFacetReferenceSyncPlan } from "../../scripts/ListingBuildFacetReferenceSyncPlanScript.js";
import {
  buildFacetReferenceStateSyncQueuePartitionKey,
  buildFacetReferenceStateSyncWorkflowId,
  buildFacetReferenceStateSyncWorkflowIdempotencyContext,
  type FacetReferenceStateSyncWorkflowInput,
} from "../FacetReferenceStateSyncWorkflow.js";
import {
  isDuplicateWorkflowStartError,
  LISTING_INDEX_ACTIONS_QUEUE,
} from "../listingIndexWorkflowHelpers.js";

type StartFacetReferenceStateSyncLogger = {
  error(bindings: Record<string, unknown>, message: string): void;
};

export type ListingBatchStartFacetReferenceStateSyncInput = {
  broker: ServiceBroker;
  logger: StartFacetReferenceStateSyncLogger;
  writeResult: {
    appliedProductIds: string[];
  };
  plansByProductId: Record<string, ListingFacetReferenceSyncPlan>;
};

export type ListingBatchStartFacetReferenceStateSyncResult = {
  workflowIdsByProductId: Record<string, string | null>;
};

export async function startFacetReferenceStateSyncBatch(
  input: ListingBatchStartFacetReferenceStateSyncInput,
): Promise<ListingBatchStartFacetReferenceStateSyncResult> {
  const workflowIdsByProductId: Record<string, string | null> = {};

  for (const productId of [...input.writeResult.appliedProductIds].sort()) {
    const plan = input.plansByProductId[productId];
    workflowIdsByProductId[productId] = plan
      ? await startFacetReferenceStateSyncForPlan(input, plan)
      : null;
  }

  return {
    workflowIdsByProductId,
  };
}

async function startFacetReferenceStateSyncForPlan(
  input: Pick<ListingBatchStartFacetReferenceStateSyncInput, "broker" | "logger">,
  plan: ListingFacetReferenceSyncPlan,
): Promise<string | null> {
  if (plan.refs.length === 0) {
    return null;
  }

  const workflowInput: FacetReferenceStateSyncWorkflowInput = {
    organizationId: plan.organizationId,
    storeId: plan.storeId,
    reason: plan.reason,
    eventSequence: plan.eventSequence,
    refs: plan.refs,
    checkValues: true,
  };
  const idempotencyCtx = buildFacetReferenceStateSyncWorkflowIdempotencyContext({
    organizationId: plan.organizationId,
    productId: plan.productId,
    reason: plan.reason,
    eventSequence: plan.eventSequence,
    operationId: plan.operationId,
    actionType: plan.actionType,
    refsHash: plan.refsHash,
  });
  const workflowId = buildFacetReferenceStateSyncWorkflowId({
    idempotencyCtx,
  });

  try {
    const started = await input.broker.startWorkflow(
      "listing.syncFacetReferenceState",
      workflowInput,
      idempotencyCtx,
      {
        queueName: LISTING_INDEX_ACTIONS_QUEUE,
        enqueueOptions: {
          queuePartitionKey: buildFacetReferenceStateSyncQueuePartitionKey({
            storeId: plan.storeId,
            productId: plan.productId,
          }),
        },
        timeoutMS: 120_000,
        workflowId,
      },
    );

    return started.workflowId;
  } catch (error) {
    if (isDuplicateWorkflowStartError(error, workflowId)) {
      return workflowId;
    }

    input.logger.error(
      {
        error,
        workflowName: "listing.syncFacetReferenceState",
        workflowId,
        parentWorkflowId: DBOS.workflowID,
        storeId: plan.storeId,
        productId: plan.productId,
        eventSequence: plan.eventSequence,
        reason: plan.reason,
      },
      "Failed to start facet reference state sync workflow",
    );
    throw error;
  }
}
