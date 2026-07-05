import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import { ListingBuildSyncWriteModelScript } from "../scripts/ListingBuildSyncWriteModelScript.js";
import { ListingPrepareIndexActionScript } from "../scripts/ListingPrepareIndexActionScript.js";
import { ListingWriteIndexActionScript } from "../scripts/ListingWriteIndexActionScript.js";
import type {
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
    action: ListingIndexQueuedSyncAction
  ): Promise<ListingIndexPreparedSyncAction> {
    const kernel = Kernel.getInstance();

    return kernel.runScript(
      ListingPrepareIndexActionScript,
      action,
      buildRunScriptContext(action)
    ) as Promise<ListingIndexPreparedSyncAction>;
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
    const prepared = await this.stepPrepareSyncIndexAction(action);

    if (prepared.kind === "final") {
      return prepared.result;
    }

    const syncWriteModel = await this.stepBuildSyncWriteModel({
      action: prepared.action,
    });

    return this.stepWriteSyncIndexAction({
      action: prepared.action,
      syncWriteModel,
    });
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

    return this.stepWriteDeleteIndexAction({
      action: prepared.action,
    });
  }
}

function buildRunScriptContext(
  action:
    | ListingIndexQueuedSyncAction
    | ListingIndexQueuedDeleteAction
    | ListingPreparedSyncAction
    | ListingPreparedDeleteAction
): RunScriptContext {
  const params = action.params;
  const content =
    action.type === "syncSellableItem" ? action.params.item.content : null;

  return {
    storeId: params.storeId,
    organizationId: params.storeId,
    requestId: params.meta.source.requestId ?? params.meta.operationId,
    locale: content?.defaultLocale,
    defaultLocale: content?.defaultLocale ?? "uk",
  };
}
