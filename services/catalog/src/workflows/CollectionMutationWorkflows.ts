import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  buildIdempotencyKey,
  DBOS,
  InjectBroker,
  Policy,
  RetryableError,
  ServiceBroker,
  Workflow,
  WorkflowStep,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import type { CollectionUpdatedReason } from "@shopana/events";
import {
  ListingCollectionActions,
  type PreviewCollectionRulesParams,
  type PreviewCollectionRulesResult,
} from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import {
  CollectionMutationDispatchScript,
  type CollectionMutationDispatchResult,
  type CollectionMutationOperation,
} from "../scripts/collection/CollectionMutationDispatchScript.js";
import {
  CollectionProductSyncPageScript,
  type CollectionProductSyncPageResult,
} from "../scripts/collection/CollectionProductSyncPageScript.js";

interface CollectionWorkflowContext {
  storeId: string;
  organizationId: string;
  requestId: string;
  userId?: string;
  locale: string;
  currency: string;
  defaultLocale: string;
  defaultCurrency: string;
  locales: string[];
  currencies: string[];
}

export interface CollectionMutationWorkflowInput {
  operation: CollectionMutationOperation;
  requestHash: string;
  reasons: CollectionUpdatedReason[];
  context: CollectionWorkflowContext;
}

interface CollectionProductSyncWorkflowInput {
  operationId: string;
  collectionId: string;
  context: CollectionWorkflowContext;
}

export interface CollectionRulesPreviewWorkflowInput {
  organizationId: string;
  storeId: string;
  params: PreviewCollectionRulesParams;
}

@Injectable()
export class CollectionRulesPreviewWorkflow extends BrokerWorkflows<
  CollectionRulesPreviewWorkflowInput,
  PreviewCollectionRulesResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("collectionRulesPreview")
  @Policy<CollectionRulesPreviewWorkflowInput>({
    resource: "store.data",
    action: "read",
    organizationId: (_self, input) => input.organizationId,
    domain: (_self, input) => `store:${input.storeId}`,
  })
  async run(
    input: CollectionRulesPreviewWorkflowInput,
  ): Promise<PreviewCollectionRulesResult> {
    try {
      return await this.preview(input.params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        code: /timeout/i.test(message)
          ? "COLLECTION_PREVIEW_TIMEOUT"
          : "COLLECTION_PREVIEW_UNAVAILABLE",
        message: "Collection rule preview is temporarily unavailable",
        retryable: true,
      };
    }
  }

  @WorkflowStep({
    name: "previewCollectionRules",
    timeoutMs: 5_000,
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async preview(
    params: PreviewCollectionRulesParams,
  ): Promise<PreviewCollectionRulesResult> {
    const result = await this.broker.call<
      PreviewCollectionRulesResult,
      PreviewCollectionRulesParams
    >(ListingCollectionActions.previewRules, params);
    if (!result.ok && result.retryable) {
      throw new RetryableError(`${result.code}: ${result.message}`);
    }
    return result;
  }
}

@Injectable()
export class CollectionMutationWorkflow extends BrokerWorkflows<
  CollectionMutationWorkflowInput,
  CollectionMutationDispatchResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("collectionMutate")
  @Policy<CollectionMutationWorkflowInput>({
    resource: "store.data",
    action: "write",
    organizationId: (_self, input) => input.context.organizationId,
    domain: (_self, input) => `store:${input.context.storeId}`,
  })
  async run(
    input: CollectionMutationWorkflowInput,
  ): Promise<CollectionMutationDispatchResult> {
    const result = await this.mutate({
      input,
      workflowId: DBOS.workflowID!,
    });
    if (result.userErrors.length > 0) return result;
    if (!mutationChanged(input.operation, result)) return result;
    await this.emitCollectionEvent({ input, result });
    const collectionId =
      "deletedCollectionId" in result
        ? result.deletedCollectionId
        : "collection" in result ? result.collection?.id : undefined;
    if (result.syncOperationId && collectionId) {
      await this.startProductSync({
        operationId: result.syncOperationId,
        collectionId,
        context: input.context,
      });
    }
    return result;
  }

  @WorkflowStep({
    name: "mutateCollection",
    timeoutMs: 60_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private mutate(input: {
    input: CollectionMutationWorkflowInput;
    workflowId: string;
  }): Promise<CollectionMutationDispatchResult> {
    return Kernel.getInstance().runScript(
      CollectionMutationDispatchScript,
      {
        workflowId: input.workflowId,
        requestHash: input.input.requestHash,
        operation: input.input.operation,
      },
      runScriptContext(input.input.context, input.workflowId),
    );
  }

  @WorkflowStep({
    name: "emitCollectionChanged",
    timeoutMs: 30_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async emitCollectionEvent(input: {
    input: CollectionMutationWorkflowInput;
    result: CollectionMutationDispatchResult;
  }): Promise<void> {
    const details =
      "deletedCollectionId" in input.result
        ? input.result.deletedCollectionId &&
          input.result.revision !== undefined &&
          input.result.listingRevision !== undefined &&
          input.result.deletedAt
          ? {
              collectionId: input.result.deletedCollectionId,
              revision: input.result.revision,
              listingRevision: input.result.listingRevision,
              deletedAt: input.result.deletedAt,
            }
          : null
        : "collection" in input.result && input.result.collection
          ? {
              collectionId: input.result.collection.id,
              revision: input.result.collection.revision,
              listingRevision: input.result.collection.listingRevision,
              deletedAt: null,
            }
          : null;
    if (!details) return;
    const { collectionId, revision, listingRevision } = details;
    const eventType =
      input.input.operation.kind === "create"
        ? "collectionCreated"
        : input.input.operation.kind === "delete"
          ? "collectionDeleted"
          : "collectionUpdated";
    await this.broker.startWorkflow(
      "events.emit",
      {
        eventType,
        payload: {
          storeId: input.input.context.storeId,
          collectionId,
          revision,
          listingRevision,
          reasons: [...new Set(input.input.reasons)],
          ...(details.deletedAt ? { deletedAt: details.deletedAt } : {}),
        },
        context: {
          organizationId: input.input.context.organizationId,
          userId: input.input.context.userId,
        },
        subject: { type: "collection", id: collectionId },
        actor: input.input.context.userId
          ? { type: "user", id: input.input.context.userId }
          : undefined,
        emitKey: `collection:${collectionId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCollectionChanged",
        callId: `${collectionId}:${revision}`,
      },
    );
  }

  @WorkflowStep({
    name: "startCollectionProductSync",
    timeoutMs: 30_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async startProductSync(
    input: CollectionProductSyncWorkflowInput,
  ): Promise<void> {
    const workflowName = "catalog.collectionProductSync";
    const idempotencyContext: IdempotencyContext = {
      source: "content",
      organizationId: input.context.organizationId,
      resourceId: `collection-sync:${input.operationId}`,
      operation: workflowName,
      contentHash: input.operationId,
    };
    await this.broker.startWorkflow(
      workflowName,
      input,
      idempotencyContext,
      {
        workflowId: buildIdempotencyKey(workflowName, idempotencyContext),
        queueName: "catalog_collection_product_sync",
        enqueueOptions: {
          queuePartitionKey: `${input.context.storeId}:collection:${input.collectionId}`,
        },
        timeoutMS: 600_000,
      },
    );
  }
}

@Injectable()
export class CollectionProductSyncWorkflow extends BrokerWorkflows<
  CollectionProductSyncWorkflowInput,
  { operationId: string; emittedCount: number }
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("collectionProductSync")
  async run(
    input: CollectionProductSyncWorkflowInput,
  ): Promise<{ operationId: string; emittedCount: number }> {
    let emittedCount = 0;
    while (true) {
      const page = await this.page({
        input,
        action: "next",
      });
      if (page.action !== "next") {
        throw new Error("Collection sync page returned an unexpected result");
      }
      if (page.productIds.length === 0) {
        return { operationId: input.operationId, emittedCount };
      }
      for (const productId of page.productIds) {
        await this.emitProductUpdated(input, productId);
      }
      await this.page({
        input,
        action: "mark",
        productIds: page.productIds,
      });
      emittedCount += page.productIds.length;
      Kernel.getInstance().getServices().logger.info(
        {
          reason: "collection",
          status: "progress",
          emittedCount,
          pageSize: page.productIds.length,
        },
        "Collection product synchronization progressed",
      );
    }
  }

  @WorkflowStep({
    name: "collectionProductSyncPage",
    timeoutMs: 30_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private page(input: {
    input: CollectionProductSyncWorkflowInput;
    action: "next" | "mark";
    productIds?: string[];
  }): Promise<CollectionProductSyncPageResult> {
    return Kernel.getInstance().runScript(
      CollectionProductSyncPageScript,
      input.action === "next"
        ? { action: "next", operationId: input.input.operationId }
        : {
            action: "mark",
            operationId: input.input.operationId,
            productIds: input.productIds ?? [],
          },
      runScriptContext(input.input.context),
    );
  }

  @WorkflowStep({
    name: "emitCollectionProductUpdated",
    timeoutMs: 30_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async emitProductUpdated(
    input: CollectionProductSyncWorkflowInput,
    productId: string,
  ): Promise<void> {
    await this.broker.startWorkflow(
      "events.emit",
      {
        eventType: "productUpdated",
        payload: {
          productId,
          storeId: input.context.storeId,
          reasons: ["collection"],
        },
        context: {
          organizationId: input.context.organizationId,
          userId: input.context.userId,
        },
        subject: { type: "product", id: productId },
        emitKey: `collection:${input.operationId}:product:${productId}`,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "emitCollectionProductUpdated",
        callId: `${input.operationId}:${productId}`,
      },
    );
  }
}

function runScriptContext(
  context: CollectionWorkflowContext,
  requestId = context.requestId,
) {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    requestId,
    userId: context.userId,
    locale: context.locale,
    defaultLocale: context.defaultLocale,
    defaultCurrency: context.defaultCurrency,
    locales: context.locales,
    currencies: context.currencies,
  };
}

function mutationChanged(
  operation: CollectionMutationOperation,
  result: CollectionMutationDispatchResult,
): boolean {
  if (operation.kind === "create" || operation.kind === "delete") return true;
  return (
    "collection" in result &&
    !!result.collection &&
    result.collection.revision > operation.params.expectedRevision
  );
}
