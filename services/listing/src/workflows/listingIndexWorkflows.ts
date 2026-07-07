import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  DBOS,
  InjectBroker,
  RetryableError,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { Catalog, Listing } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  ListingBuildFacetReferenceSyncPlanScript,
  type ListingFacetReferenceSyncPlan,
} from "../scripts/ListingBuildFacetReferenceSyncPlanScript.js";
import { ListingBuildSyncWriteModelScript } from "../scripts/ListingBuildSyncWriteModelScript.js";
import { ListingPrepareIndexActionScript } from "../scripts/ListingPrepareIndexActionScript.js";
import { ListingResolveFacetSelectionsScript } from "../scripts/ListingResolveFacetSelectionsScript.js";
import { ListingWriteIndexActionScript } from "../scripts/ListingWriteIndexActionScript.js";
import { mapCatalogProductToListingSnapshot } from "./catalogListingSnapshotMapper.js";
import {
  buildListingIndexPayloadHash,
  isDuplicateWorkflowStartError,
  LISTING_INDEX_ACTIONS_QUEUE,
} from "./listingIndexWorkflowHelpers.js";
import {
  buildFacetReferenceStateSyncQueuePartitionKey,
  buildFacetReferenceStateSyncWorkflowId,
  buildFacetReferenceStateSyncWorkflowIdempotencyContext,
  type FacetReferenceStateSyncWorkflowInput,
} from "./FacetReferenceStateSyncWorkflow.js";
import { ListingIndexActionScriptError } from "../scripts/listingIndexActionTypes.js";
import type {
  ListingIndexHydratedSyncAction,
  ListingIndexPreparedDeleteAction,
  ListingIndexPreparedSyncAction,
  ListingIndexQueuedDeleteAction,
  ListingIndexQueuedSyncAction,
  ListingPreparedDeleteAction,
  ListingPreparedDeleteWriteAction,
  ListingPreparedSyncAction,
  ListingPreparedSyncWriteAction,
  ListingSyncWriteModel,
} from "../scripts/listingIndexActionTypes.js";

type GetStoreByIdResult = {
  store: {
    id: string;
    organizationId: string;
    defaultLocale: string;
  } | null;
  userErrors: Array<{
    code: string;
    message: string;
    field?: string[] | null;
  }>;
};

type ListingCatalogHydrationResult =
  | {
      kind: "found";
      action: ListingIndexHydratedSyncAction;
    }
  | {
      kind: "missing";
      result: Listing.ListingUpdateResult;
    };

abstract class ListingIndexWorkflowBase<
  TInput,
  TOutput,
> extends BrokerWorkflows<TInput, TOutput> {
  @WorkflowStep({
    name: "prepareListingSyncIndexAction",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepPrepareSyncIndexAction(
    action: ListingIndexHydratedSyncAction
  ): Promise<ListingIndexPreparedSyncAction> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingPrepareIndexActionScript,
      action,
      buildRunScriptContext(action)
    ) as Promise<ListingIndexPreparedSyncAction>;
  }

  @WorkflowStep({
    name: "resolveListingFacetSelections",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepResolveFacetSelections(
    action: ListingIndexHydratedSyncAction
  ): Promise<ListingIndexHydratedSyncAction> {
    const kernel = Kernel.getInstance();
    const result = await kernel.runScript(
      ListingResolveFacetSelectionsScript,
      action,
      buildRunScriptContext(action)
    );

    return result.action;
  }

  @WorkflowStep({
    name: "prepareListingDeleteIndexAction",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepPrepareDeleteIndexAction(
    action: ListingIndexQueuedDeleteAction
  ): Promise<ListingIndexPreparedDeleteAction> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingPrepareIndexActionScript,
      action,
      buildRunScriptContext(action)
    ) as Promise<ListingIndexPreparedDeleteAction>;
  }

  @WorkflowStep({
    name: "buildListingSyncWriteModel",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 3,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepBuildSyncWriteModel(input: {
    action: ListingPreparedSyncAction;
  }): Promise<ListingSyncWriteModel> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingBuildSyncWriteModelScript,
      input,
      buildRunScriptContext(input.action)
    );
  }

  @WorkflowStep({
    name: "buildListingFacetReferenceSyncPlan",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepBuildFacetReferenceSyncPlan(
    input:
      | {
          action: ListingPreparedSyncAction;
          syncWriteModel: ListingSyncWriteModel;
        }
      | {
          action: ListingPreparedDeleteAction;
        }
  ): Promise<ListingFacetReferenceSyncPlan> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingBuildFacetReferenceSyncPlanScript,
      input,
      buildRunScriptContext(input.action)
    );
  }

  @WorkflowStep({
    name: "writeListingSyncIndexAction",
    timeoutMs: 120_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepWriteSyncIndexAction(
    input: ListingPreparedSyncWriteAction
  ): Promise<Listing.ListingUpdateResult> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingWriteIndexActionScript,
      input,
      buildRunScriptContext(input.action)
    );
  }

  @WorkflowStep({
    name: "startFacetReferenceStateSync",
    timeoutMs: 30_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepStartFacetReferenceStateSync(input: {
    result: Listing.ListingUpdateResult;
    plan: ListingFacetReferenceSyncPlan;
  }): Promise<string | null> {
    if (input.result.status === "ignored_stale" || input.plan.refs.length === 0) {
      return null;
    }

    const workflowInput: FacetReferenceStateSyncWorkflowInput = {
      organizationId: input.plan.organizationId,
      storeId: input.plan.storeId,
      reason: input.plan.reason,
      sourceSequence: input.plan.sourceSequence,
      refs: input.plan.refs,
      checkValues: true,
    };
    const idempotencyCtx =
      buildFacetReferenceStateSyncWorkflowIdempotencyContext({
        organizationId: input.plan.organizationId,
        productId: input.plan.productId,
        reason: input.plan.reason,
        sourceSequence: input.plan.sourceSequence,
        operationId: input.plan.operationId,
        actionType: input.plan.actionType,
        refsHash: input.plan.refsHash,
      });
    const workflowId = buildFacetReferenceStateSyncWorkflowId({
      idempotencyCtx,
    });

    try {
      const started = await this.broker.startWorkflow(
        "listing.syncFacetReferenceState",
        workflowInput,
        idempotencyCtx,
        {
          queueName: LISTING_INDEX_ACTIONS_QUEUE,
          enqueueOptions: {
            queuePartitionKey: buildFacetReferenceStateSyncQueuePartitionKey({
              storeId: input.plan.storeId,
              productId: input.plan.productId,
            }),
          },
          timeoutMS: 120_000,
          workflowId,
        }
      );
      return started.workflowId;
    } catch (error) {
      if (isDuplicateWorkflowStartError(error, workflowId)) {
        return workflowId;
      }

      this.logger.error(
        {
          error,
          workflowName: "listing.syncFacetReferenceState",
          workflowId,
          parentWorkflowId: DBOS.workflowID,
          storeId: input.plan.storeId,
          productId: input.plan.productId,
          sourceSequence: input.plan.sourceSequence,
          reason: input.plan.reason,
        },
        "Failed to start facet reference state sync workflow"
      );
      throw error;
    }
  }

  @WorkflowStep({
    name: "writeListingDeleteIndexAction",
    timeoutMs: 120_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  protected async stepWriteDeleteIndexAction(
    input: ListingPreparedDeleteWriteAction
  ): Promise<Listing.ListingUpdateResult> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingWriteIndexActionScript,
      input,
      buildRunScriptContext(input.action)
    );
  }
}

@Injectable()
export class ListingSyncSellableItemIndexWorkflow extends ListingIndexWorkflowBase<
  ListingIndexQueuedSyncAction,
  Listing.ListingUpdateResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("syncSellableItemIndex")
  async run(
    action: ListingIndexQueuedSyncAction
  ): Promise<Listing.ListingUpdateResult> {
    const hydration = await this.stepFetchCatalogListingSnapshot(action);

    if (hydration.kind === "missing") {
      return hydration.result;
    }

    const resolved = await this.stepResolveFacetSelections(hydration.action);
    const prepared = await this.stepPrepareSyncIndexAction(resolved);

    if (prepared.kind === "final") {
      return prepared.result;
    }

    const syncWriteModel = await this.stepBuildSyncWriteModel({
      action: prepared.action,
    });
    const facetReferenceSyncPlan = await this.stepBuildFacetReferenceSyncPlan({
      action: prepared.action,
      syncWriteModel,
    });

    const result = await this.stepWriteSyncIndexAction({
      action: prepared.action,
      syncWriteModel,
    });
    await this.stepStartFacetReferenceStateSync({
      result,
      plan: facetReferenceSyncPlan,
    });

    return result;
  }

  @WorkflowStep({
    name: "fetchCatalogListingSnapshot",
    timeoutMs: 60_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepFetchCatalogListingSnapshot(
    action: ListingIndexQueuedSyncAction
  ): Promise<ListingCatalogHydrationResult> {
    const [queryResult, storeResult] = await Promise.all([
      this.broker.call<Catalog.CatalogQueryResult, Catalog.CatalogQueryParams>(
        "catalog.query",
        {
          storeId: action.params.storeId,
          selection: buildProductSnapshotSelection(action.params.itemRef.id),
        }
      ),
      this.broker.call<GetStoreByIdResult, { id: string }>(
        "project.getStoreById",
        { id: action.params.storeId }
      ),
    ]);

    if (!storeResult.store) {
      const message =
        storeResult.userErrors[0]?.message ??
        `Store with id "${action.params.storeId}" not found`;
      throw new Error(message);
    }

    if (!queryResult.ok) {
      if (queryResult.retryable) {
        throw new RetryableError(
          `Catalog product query failed: ${queryResult.code}: ${queryResult.message}`
        );
      }

      throw new Error(
        `Catalog product query failed: ${queryResult.code}: ${queryResult.message}`
      );
    }

    const product = queryResult.data.products?.edges?.[0]?.node;
    if (!product) {
      return {
        kind: "missing",
        result: {
          operationId: action.params.meta.operationId,
          storeId: action.params.storeId,
          itemRef: action.params.itemRef,
          sourceSequence: action.params.sourceSequence,
          status: "noop",
          processedAt: new Date().toISOString(),
          warnings: [
            {
              code: "CATALOG_PRODUCT_NOT_FOUND",
              field: ["itemRef", "id"],
              message: "Catalog product snapshot was not found during listing sync",
            },
          ],
        },
      };
    }

    if (product.storeId !== action.params.storeId) {
      throw new ListingIndexActionScriptError([
        {
          code: "PROJECT_MISMATCH",
          field: ["storeId"],
          message: "Catalog product storeId does not match listing sync storeId",
        },
      ]);
    }

    const syncParams: Listing.SyncSellableItemParams = {
      meta: action.params.meta,
      storeId: action.params.storeId,
      sourceSequence: action.params.sourceSequence,
      item: mapCatalogProductToListingSnapshot({
        product,
        defaultLocale: storeResult.store.defaultLocale,
      }),
    };

    return {
      kind: "found",
      action: {
        type: "syncSellableItem",
        params: syncParams,
        organizationId: storeResult.store.organizationId,
        effectiveIdempotencyKey: action.effectiveIdempotencyKey,
        payloadHash: buildListingIndexPayloadHash({
          type: "syncSellableItem",
          params: syncParams,
        }),
      },
    };
  }
}

@Injectable()
export class ListingDeleteSellableItemIndexWorkflow extends ListingIndexWorkflowBase<
  ListingIndexQueuedDeleteAction,
  Listing.ListingUpdateResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("deleteSellableItemIndex")
  async run(
    action: ListingIndexQueuedDeleteAction
  ): Promise<Listing.ListingUpdateResult> {
    const prepared = await this.stepPrepareDeleteIndexAction(action);

    if (prepared.kind === "final") {
      return prepared.result;
    }

    const facetReferenceSyncPlan = await this.stepBuildFacetReferenceSyncPlan({
      action: prepared.action,
    });
    const result = await this.stepWriteDeleteIndexAction({
      action: prepared.action,
    });
    await this.stepStartFacetReferenceStateSync({
      result,
      plan: facetReferenceSyncPlan,
    });

    return result;
  }
}

function buildRunScriptContext(
  action:
    | ListingIndexHydratedSyncAction
    | ListingIndexQueuedDeleteAction
    | ListingPreparedSyncAction
    | ListingPreparedDeleteAction
): RunScriptContext {
  const params = action.params;
  const content =
    action.type === "syncSellableItem" ? action.params.item.content : null;

  return {
    storeId: params.storeId,
    organizationId: action.organizationId,
    requestId: params.meta.source.requestId ?? params.meta.operationId,
    locale: content?.defaultLocale,
    defaultLocale: content?.defaultLocale ?? "uk",
  };
}

function buildProductSnapshotSelection(productId: string): Catalog.CatalogQuerySelection {
  return {
    populate: {
      products: {
        fieldName: "products",
        args: {
          first: 1,
          where: {
            id: {
              _eq: productId,
            },
          },
        },
        populate: {
          edges: {
            fieldName: "edges",
            populate: {
              node: {
                fields: [
                  "snapshotVersion",
                  "id",
                  "storeId",
                  "revision",
                  "kind",
                  "status",
                  "publishedAt",
                  "createdAt",
                  "updatedAt",
                  "handle",
                  "vendorId",
                ],
                populate: {
                  content: {
                    fieldName: "content",
                    fields: ["locale", "title"],
                    populate: {
                      description: {
                        fieldName: "description",
                        fields: ["text"],
                      },
                    },
                  },
                  seo: {
                    fieldName: "seo",
                    fields: ["locale", "seoTitle", "seoDescription"],
                  },
                  availability: {
                    fieldName: "availability",
                    fields: ["availableForSale", "totalQuantity"],
                  },
                  primaryCategory: {
                    fieldName: "primaryCategory",
                    fields: ["id"],
                  },
                  categories: {
                    fieldName: "categories",
                    fields: ["id"],
                  },
                  tags: {
                    fieldName: "tags",
                    fields: ["id", "handle"],
                  },
                  features: {
                    fieldName: "features",
                    fields: ["id", "handle"],
                    populate: {
                      values: {
                        fieldName: "values",
                        fields: ["id", "handle"],
                      },
                    },
                  },
                  variants: {
                    fieldName: "variants",
                    fields: ["id", "handle", "isDefault", "createdAt", "updatedAt"],
                    populate: {
                      availability: {
                        fieldName: "availability",
                        fields: ["availableForSale", "totalQuantity"],
                      },
                      prices: {
                        fieldName: "prices",
                        fields: ["currencyCode", "amountMinor"],
                      },
                      options: {
                        fieldName: "options",
                        fields: ["id", "handle"],
                        populate: {
                          values: {
                            fieldName: "values",
                            fields: ["id", "handle"],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
