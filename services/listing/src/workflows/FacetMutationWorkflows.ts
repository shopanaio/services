import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  buildIdempotencyKey,
  hashContent,
  InjectBroker,
  ServiceBroker,
  Workflow,
  WorkflowStep,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  FacetCreateScript,
  FacetDeleteScript,
  FacetIndexImpactCollectorScript,
  FacetValueCreateScript,
  FacetValueDeleteScript,
  FacetValueMergeScript,
  FacetValueUnmergeScript,
  FacetValueUpdateScript,
  type FacetIndexImpactCollectorParams,
  type FacetIndexImpactCollectorResult,
} from "../scripts/facet/index.js";
import type {
  FacetCreateParams,
  FacetDeleteParams,
  FacetDeleteResult,
  FacetResult,
  FacetValueCreateParams,
  FacetValueDeleteParams,
  FacetValueDeleteResult,
  FacetValueMergeParams,
  FacetValueMergeResult,
  FacetValueResult,
  FacetValueUnmergeParams,
  FacetValueUnmergeResult,
  FacetValueUpdateParams,
} from "../scripts/facet/dto/index.js";
import {
  type FacetAffectedProductsResyncReason,
  type FacetAffectedProductsResyncWorkflowInput,
} from "./FacetAffectedProductsResyncWorkflow.js";
import {
  isDuplicateWorkflowStartError,
  LISTING_INDEX_ACTIONS_QUEUE,
} from "./listingIndexWorkflowHelpers.js";

export interface FacetMutationWorkflowContext {
  storeId: string;
  organizationId: string;
  locale?: string;
  defaultLocale: string;
  requestId: string;
  userId?: string;
}

interface FacetMutationWorkflowInput<TParams> {
  params: TParams;
  context: FacetMutationWorkflowContext;
  operationId: string;
}

abstract class FacetMutationWorkflowBase<
  TInput,
  TOutput,
> extends BrokerWorkflows<TInput, TOutput> {
  constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected async runFacetCreate(
    input: FacetMutationWorkflowInput<FacetCreateParams>
  ): Promise<FacetResult> {
    const result = await this.stepRunFacetCreate(input);
    if (hasUserErrors(result) || !result.facet) return result;

    const impact = await this.stepCollectImpact({
      context: input.context,
      params: { facetIds: [result.facet.id], activeOnly: true },
    });
    await this.stepStartResync({
      input,
      reason: "facet_created",
      oldImpact: emptyImpact(),
      newImpact: impact,
    });

    return result;
  }

  protected async runFacetDelete(
    input: FacetMutationWorkflowInput<FacetDeleteParams>
  ): Promise<FacetDeleteResult> {
    const oldImpact = await this.stepCollectImpact({
      context: input.context,
      params: { facetIds: [input.params.id], activeOnly: false },
    });
    const result = await this.stepRunFacetDelete(input);
    if (hasUserErrors(result) || !result.deletedFacetId) return result;

    await this.stepStartResync({
      input,
      reason: "facet_deleted",
      oldImpact,
      newImpact: emptyImpact(),
    });

    return result;
  }

  protected async runFacetValueCreate(
    input: FacetMutationWorkflowInput<FacetValueCreateParams>
  ): Promise<FacetValueResult> {
    const oldImpact =
      input.params.kind === "group" && (input.params.sourceValueIds?.length ?? 0) > 0
        ? await this.stepCollectImpact({
            context: input.context,
            params: {
              valueIds: input.params.sourceValueIds,
              activeOnly: false,
            },
          })
        : emptyImpact();
    const result = await this.stepRunFacetValueCreate(input);
    if (hasUserErrors(result) || !result.facetValue) return result;

    const newImpact = await this.stepCollectImpact({
      context: input.context,
      params: { valueIds: [result.facetValue.id], activeOnly: true },
    });
    await this.stepStartResync({
      input,
      reason: "facet_value_created",
      oldImpact,
      newImpact,
    });

    return result;
  }

  protected async runFacetValueUpdate(
    input: FacetMutationWorkflowInput<FacetValueUpdateParams>
  ): Promise<FacetValueResult> {
    const oldImpact =
      input.params.enabled === false
        ? await this.stepCollectImpact({
            context: input.context,
            params: { valueIds: [input.params.id], activeOnly: true },
          })
        : emptyImpact();
    const result = await this.stepRunFacetValueUpdate(input);
    if (hasUserErrors(result) || !result.facetValue) return result;

    const newImpact =
      input.params.enabled === true
        ? await this.stepCollectImpact({
            context: input.context,
            params: { valueIds: [result.facetValue.id], activeOnly: true },
          })
        : emptyImpact();
    await this.stepStartResync({
      input,
      reason: "facet_value_updated",
      oldImpact,
      newImpact,
    });

    return result;
  }

  protected async runFacetValueDelete(
    input: FacetMutationWorkflowInput<FacetValueDeleteParams>
  ): Promise<FacetValueDeleteResult> {
    const oldImpact = await this.stepCollectImpact({
      context: input.context,
      params: { valueIds: [input.params.id], activeOnly: false },
    });
    const result = await this.stepRunFacetValueDelete(input);
    if (hasUserErrors(result) || !result.deletedFacetValueId) return result;

    await this.stepStartResync({
      input,
      reason: "facet_value_deleted",
      oldImpact,
      newImpact: emptyImpact(),
    });

    return result;
  }

  protected async runFacetValueMerge(
    input: FacetMutationWorkflowInput<FacetValueMergeParams>
  ): Promise<FacetValueMergeResult> {
    const oldImpact = await this.stepCollectImpact({
      context: input.context,
      params: { valueIds: input.params.sourceValueIds, activeOnly: false },
    });
    const result = await this.stepRunFacetValueMerge(input);
    if (hasUserErrors(result) || !result.facetValue) return result;

    const newImpact = await this.stepCollectImpact({
      context: input.context,
      params: {
        valueIds: result.sourceValues.map((value) => value.id),
        activeOnly: true,
      },
    });
    await this.stepStartResync({
      input,
      reason: "facet_value_merged",
      oldImpact,
      newImpact,
    });

    return result;
  }

  protected async runFacetValueUnmerge(
    input: FacetMutationWorkflowInput<FacetValueUnmergeParams>
  ): Promise<FacetValueUnmergeResult> {
    const oldImpact = await this.stepCollectImpact({
      context: input.context,
      params: { valueIds: input.params.sourceValueIds, activeOnly: false },
    });
    const result = await this.stepRunFacetValueUnmerge(input);
    if (hasUserErrors(result)) return result;

    const newImpact = await this.stepCollectImpact({
      context: input.context,
      params: {
        valueIds: result.sourceValues.map((value) => value.id),
        activeOnly: true,
      },
    });
    await this.stepStartResync({
      input,
      reason: "facet_value_unmerged",
      oldImpact,
      newImpact,
    });

    return result;
  }

  @WorkflowStep({
    name: "collectFacetIndexImpact",
    timeoutMs: 30_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  protected async stepCollectImpact(input: {
    context: FacetMutationWorkflowContext;
    params: FacetIndexImpactCollectorParams;
  }): Promise<FacetIndexImpactCollectorResult> {
    return Kernel.getInstance().runScript(
      FacetIndexImpactCollectorScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  @WorkflowStep({ name: "runFacetCreate", timeoutMs: 30_000 })
  protected async stepRunFacetCreate(
    input: FacetMutationWorkflowInput<FacetCreateParams>
  ): Promise<FacetResult> {
    return Kernel.getInstance().runScript(
      FacetCreateScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  @WorkflowStep({ name: "runFacetDelete", timeoutMs: 30_000 })
  protected async stepRunFacetDelete(
    input: FacetMutationWorkflowInput<FacetDeleteParams>
  ): Promise<FacetDeleteResult> {
    return Kernel.getInstance().runScript(
      FacetDeleteScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  @WorkflowStep({ name: "runFacetValueCreate", timeoutMs: 30_000 })
  protected async stepRunFacetValueCreate(
    input: FacetMutationWorkflowInput<FacetValueCreateParams>
  ): Promise<FacetValueResult> {
    return Kernel.getInstance().runScript(
      FacetValueCreateScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  @WorkflowStep({ name: "runFacetValueUpdate", timeoutMs: 30_000 })
  protected async stepRunFacetValueUpdate(
    input: FacetMutationWorkflowInput<FacetValueUpdateParams>
  ): Promise<FacetValueResult> {
    return Kernel.getInstance().runScript(
      FacetValueUpdateScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  @WorkflowStep({ name: "runFacetValueDelete", timeoutMs: 30_000 })
  protected async stepRunFacetValueDelete(
    input: FacetMutationWorkflowInput<FacetValueDeleteParams>
  ): Promise<FacetValueDeleteResult> {
    return Kernel.getInstance().runScript(
      FacetValueDeleteScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  @WorkflowStep({ name: "runFacetValueMerge", timeoutMs: 30_000 })
  protected async stepRunFacetValueMerge(
    input: FacetMutationWorkflowInput<FacetValueMergeParams>
  ): Promise<FacetValueMergeResult> {
    return Kernel.getInstance().runScript(
      FacetValueMergeScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  @WorkflowStep({ name: "runFacetValueUnmerge", timeoutMs: 30_000 })
  protected async stepRunFacetValueUnmerge(
    input: FacetMutationWorkflowInput<FacetValueUnmergeParams>
  ): Promise<FacetValueUnmergeResult> {
    return Kernel.getInstance().runScript(
      FacetValueUnmergeScript,
      input.params,
      buildRunScriptContext(input.context)
    );
  }

  protected async stepStartResync<TParams>(params: {
    input: FacetMutationWorkflowInput<TParams>;
    reason: FacetAffectedProductsResyncReason;
    oldImpact: FacetIndexImpactCollectorResult;
    newImpact: FacetIndexImpactCollectorResult;
  }): Promise<string | null> {
    const refs = [
      ...params.oldImpact.refs,
      ...params.newImpact.refs,
    ];
    if (refs.length === 0) {
      return null;
    }

    const workflowInput: FacetAffectedProductsResyncWorkflowInput = {
      storeId: params.input.context.storeId,
      organizationId: params.input.context.organizationId,
      reason: params.reason,
      operationId: params.input.operationId,
      oldRefs: params.oldImpact.refs,
      newRefs: params.newImpact.refs,
      facetIds: [
        ...new Set([
          ...params.oldImpact.facetIds,
          ...params.newImpact.facetIds,
        ]),
      ],
      userId: params.input.context.userId,
    };
    const idempotencyCtx = buildResyncIdempotencyContext(workflowInput);
    const workflowName = "listing.resyncFacetAffectedProducts";
    const workflowId = buildIdempotencyKey(workflowName, idempotencyCtx);

    try {
      const started = await this.broker.startWorkflow(
        workflowName,
        workflowInput,
        idempotencyCtx,
        {
          queueName: LISTING_INDEX_ACTIONS_QUEUE,
          enqueueOptions: {
            queuePartitionKey: `${workflowInput.storeId}:facet-resync:${workflowInput.operationId}`,
          },
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
          workflowName,
          workflowId,
          storeId: workflowInput.storeId,
          reason: workflowInput.reason,
          operationId: workflowInput.operationId,
        },
        "Failed to start facet affected products resync workflow"
      );
      throw error;
    }
  }
}

@Injectable()
export class FacetCreateWorkflow extends FacetMutationWorkflowBase<
  FacetMutationWorkflowInput<FacetCreateParams>,
  FacetResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("facetCreate")
  async run(
    input: FacetMutationWorkflowInput<FacetCreateParams>
  ): Promise<FacetResult> {
    return this.runFacetCreate(input);
  }
}

@Injectable()
export class FacetDeleteWorkflow extends FacetMutationWorkflowBase<
  FacetMutationWorkflowInput<FacetDeleteParams>,
  FacetDeleteResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("facetDelete")
  async run(
    input: FacetMutationWorkflowInput<FacetDeleteParams>
  ): Promise<FacetDeleteResult> {
    return this.runFacetDelete(input);
  }
}

@Injectable()
export class FacetValueCreateWorkflow extends FacetMutationWorkflowBase<
  FacetMutationWorkflowInput<FacetValueCreateParams>,
  FacetValueResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("facetValueCreate")
  async run(
    input: FacetMutationWorkflowInput<FacetValueCreateParams>
  ): Promise<FacetValueResult> {
    return this.runFacetValueCreate(input);
  }
}

@Injectable()
export class FacetValueUpdateWorkflow extends FacetMutationWorkflowBase<
  FacetMutationWorkflowInput<FacetValueUpdateParams>,
  FacetValueResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("facetValueUpdate")
  async run(
    input: FacetMutationWorkflowInput<FacetValueUpdateParams>
  ): Promise<FacetValueResult> {
    return this.runFacetValueUpdate(input);
  }
}

@Injectable()
export class FacetValueDeleteWorkflow extends FacetMutationWorkflowBase<
  FacetMutationWorkflowInput<FacetValueDeleteParams>,
  FacetValueDeleteResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("facetValueDelete")
  async run(
    input: FacetMutationWorkflowInput<FacetValueDeleteParams>
  ): Promise<FacetValueDeleteResult> {
    return this.runFacetValueDelete(input);
  }
}

@Injectable()
export class FacetValueMergeWorkflow extends FacetMutationWorkflowBase<
  FacetMutationWorkflowInput<FacetValueMergeParams>,
  FacetValueMergeResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("facetValueMerge")
  async run(
    input: FacetMutationWorkflowInput<FacetValueMergeParams>
  ): Promise<FacetValueMergeResult> {
    return this.runFacetValueMerge(input);
  }
}

@Injectable()
export class FacetValueUnmergeWorkflow extends FacetMutationWorkflowBase<
  FacetMutationWorkflowInput<FacetValueUnmergeParams>,
  FacetValueUnmergeResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("facetValueUnmerge")
  async run(
    input: FacetMutationWorkflowInput<FacetValueUnmergeParams>
  ): Promise<FacetValueUnmergeResult> {
    return this.runFacetValueUnmerge(input);
  }
}

function buildRunScriptContext(
  context: FacetMutationWorkflowContext
): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    locale: context.locale,
    defaultLocale: context.defaultLocale,
    userId: context.userId,
    requestId: context.requestId,
  };
}

function buildResyncIdempotencyContext(
  input: FacetAffectedProductsResyncWorkflowInput
): IdempotencyContext {
  return {
    source: "content",
    organizationId: input.organizationId,
    resourceId: `${input.storeId}:facet-resync:${input.operationId}`,
    operation: "listing.resyncFacetAffectedProducts",
    contentHash: hashContent({
      v: 1,
      storeId: input.storeId,
      reason: input.reason,
      operationId: input.operationId,
      oldRefs: input.oldRefs ?? [],
      newRefs: input.newRefs ?? [],
      facetIds: input.facetIds ?? [],
    }),
  };
}

function hasUserErrors(result: { userErrors: readonly unknown[] }): boolean {
  return result.userErrors.length > 0;
}

function emptyImpact(): FacetIndexImpactCollectorResult {
  return { refs: [], facetIds: [] };
}
