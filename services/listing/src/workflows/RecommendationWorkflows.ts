import { Injectable, Logger } from "@nestjs/common";
import {
  BrokerWorkflows,
  buildIdempotencyKey,
  hashContent,
  InjectBroker,
  Policy,
  ServiceBroker,
  Workflow,
  WorkflowStep,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import type { OrderSaleCommittedEvent, OrderSaleReversedEvent } from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import type { RunScriptContext } from "../kernel/types.js";
import {
  ManualProductRecommendationCreateScript,
  ManualProductRecommendationDeleteScript,
  ManualProductRecommendationUpdateScript,
  RecommendationCalculationRunComputeScript,
  RecommendationCalculationRunCreateScript,
  RecommendationCalculationRunTransitionScript,
  RecommendationCalculationShouldRunScript,
  RecommendationFanOutPageScript,
  RecommendationOrderFactIngestScript,
  RecommendationMaintenanceCompleteScript,
  RecommendationMaintenanceOpenScript,
  RecommendationMaintenanceRequestPageScript,
  RecommendationLifecycleAffectedPageScript,
  RecommendationReferenceStateSyncScript,
  RecommendationPlacementPolicySetEnabledScript,
  RecommendationPlacementPolicyUpsertScript,
  RecommendationSnapshotCreateScript,
  RecommendationSnapshotPopulateScript,
  RecommendationSnapshotTransitionScript,
  type ManualRecommendationCreateParams,
  type ManualRecommendationResult,
  type ManualRecommendationUpdateParams,
  type RecommendationPolicyResult,
  type RecommendationPolicyUpsertParams,
} from "../scripts/recommendation/index.js";
import type { RecommendationPlacement } from "../repositories/models/recommendationRuntime.js";
import type { RecommendationRequestGeneration } from "../repositories/recommendation/types.js";
import { isDuplicateWorkflowStartError } from "./listingIndexWorkflowHelpers.js";
import { RecommendationIntegrityError } from "../recommendation/errors.js";

export const RECOMMENDATION_SNAPSHOT_QUEUE = "recommendation_snapshot_build" as const;
export const RECOMMENDATION_INGESTION_QUEUE = "recommendation_order_fact_ingestion" as const;

export interface RecommendationWorkflowContext {
  storeId: string;
  organizationId: string;
  requestId: string;
  userId?: string;
  locale?: string;
  defaultLocale?: string;
}

function scriptContext(context: RecommendationWorkflowContext): RunScriptContext {
  return {
    storeId: context.storeId,
    organizationId: context.organizationId,
    requestId: context.requestId,
    userId: context.userId,
    locale: context.locale,
    defaultLocale: context.defaultLocale,
  };
}

abstract class RecommendationWorkflowBase<TInput = unknown, TOutput = unknown>
  extends BrokerWorkflows<TInput, TOutput> {
  protected readonly logger = new Logger("RecommendationWorkflows");

  constructor(broker: ServiceBroker) {
    super(broker);
  }

  protected async startBuild(
    context: RecommendationWorkflowContext,
    request: RecommendationRequestGeneration,
  ): Promise<void> {
    const input: RecommendationSnapshotBuildInput = { context, request };
    const idempotency = buildContext("recommendationSnapshotBuild", context, {
      anchorProductId: request.anchorProductId,
      placement: request.placement,
      generation: request.generation,
    });
    const workflowId = buildIdempotencyKey("listing.recommendationSnapshotBuild", idempotency);
    try {
      await this.broker.startWorkflow(
        "listing.recommendationSnapshotBuild",
        input,
        idempotency,
        {
          workflowId,
          queueName: RECOMMENDATION_SNAPSHOT_QUEUE,
          enqueueOptions: {
            queuePartitionKey: `${context.storeId}:${buildLane(request.anchorProductId, request.placement)}`,
          },
        },
      );
    } catch (error) {
      if (!isDuplicateWorkflowStartError(error, workflowId)) throw error;
    }
  }
}

interface RecommendationSnapshotBuildInput {
  context: RecommendationWorkflowContext;
  request: RecommendationRequestGeneration;
}

@Injectable()
export class RecommendationSnapshotBuildWorkflow extends RecommendationWorkflowBase<
  RecommendationSnapshotBuildInput,
  { status: "activated" | "stale" | "disabled" }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationSnapshotBuild")
  async run(input: RecommendationSnapshotBuildInput) {
    const created = await this.createSnapshot(input);
    if (created.status !== "created") return { status: created.status };
    try {
      await this.populateSnapshot(input.context, created.snapshotId);
      await this.transition(input.context, created.snapshotId, "READY");
      const activated = await this.activate(input.context, created.snapshotId);
      if (activated.status === "stale" && activated.rebuildRequest) {
        await this.startBuild(input.context, activated.rebuildRequest);
      }
      this.logger.log({
        storeId: input.context.storeId,
        anchorProductId: input.request.anchorProductId,
        placement: input.request.placement,
        snapshotId: created.snapshotId,
        status: activated.status,
      }, "Recommendation snapshot build completed");
      return { status: activated.status === "applied" ? "activated" as const : "stale" as const };
    } catch (error) {
      const failed = await this.fail(input.context, created.snapshotId, failureCode(error));
      if (failed.rebuildRequest) {
        await this.startBuild(input.context, failed.rebuildRequest);
      }
      this.logger.error({
        error,
        storeId: input.context.storeId,
        anchorProductId: input.request.anchorProductId,
        placement: input.request.placement,
        snapshotId: created.snapshotId,
        failureCode: failureCode(error),
      }, "Recommendation snapshot build failed");
      throw error;
    }
  }

  @WorkflowStep({ retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private createSnapshot(input: RecommendationSnapshotBuildInput) {
    return Kernel.getInstance().runScript(RecommendationSnapshotCreateScript, {
      anchorProductId: input.request.anchorProductId,
      placement: input.request.placement,
      requestedGeneration: input.request.generation,
      triggerKey: input.request.triggerKey,
    }, scriptContext(input.context));
  }

  @WorkflowStep({ timeoutMs: 60_000, retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private populateSnapshot(context: RecommendationWorkflowContext, snapshotId: string) {
    return Kernel.getInstance().runScript(
      RecommendationSnapshotPopulateScript,
      { snapshotId },
      scriptContext(context),
    );
  }

  @WorkflowStep()
  private transition(context: RecommendationWorkflowContext, snapshotId: string, transition: "READY") {
    return Kernel.getInstance().runScript(
      RecommendationSnapshotTransitionScript,
      { snapshotId, transition },
      scriptContext(context),
    );
  }

  @WorkflowStep()
  private activate(context: RecommendationWorkflowContext, snapshotId: string) {
    return Kernel.getInstance().runScript(
      RecommendationSnapshotTransitionScript,
      { snapshotId, transition: "ACTIVE" },
      scriptContext(context),
    );
  }

  @WorkflowStep()
  private fail(context: RecommendationWorkflowContext, snapshotId: string, failureCodeValue: string) {
    return Kernel.getInstance().runScript(
      RecommendationSnapshotTransitionScript,
      { snapshotId, transition: "FAILED", failureCode: failureCodeValue },
      scriptContext(context),
    );
  }
}

export interface RecommendationFanOutInput {
  context: RecommendationWorkflowContext;
  placement: RecommendationPlacement;
  triggerKey: string;
  calculationRunId?: string;
  includePopularityPolicies?: boolean;
  requiredFallbackCode?: "category_popularity" | "store_popularity";
}

@Injectable()
export class RecommendationSnapshotFanOutWorkflow extends RecommendationWorkflowBase<
  RecommendationFanOutInput,
  { requested: number }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationSnapshotFanOut")
  async run(input: RecommendationFanOutInput): Promise<{ requested: number }> {
    let afterProductId: string | undefined;
    let requested = 0;
    do {
      const page = await this.page(input, afterProductId);
      for (const request of page.requests) await this.startBuild(input.context, request);
      requested += page.requests.length;
      afterProductId = page.nextCursor ?? undefined;
    } while (afterProductId);
    this.logger.log({
      storeId: input.context.storeId,
      placement: input.placement,
      requested,
      triggerKey: input.triggerKey,
    }, "Recommendation snapshot fan-out completed");
    return { requested };
  }

  @WorkflowStep({ timeoutMs: 30_000, retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private page(input: RecommendationFanOutInput, afterProductId?: string) {
    return Kernel.getInstance().runScript(RecommendationFanOutPageScript, {
      placement: input.placement,
      triggerKey: input.triggerKey,
      calculationRunId: input.calculationRunId,
      includePopularityPolicies: input.includePopularityPolicies,
      requiredFallbackCode: input.requiredFallbackCode,
      afterProductId,
    }, scriptContext(input.context));
  }
}

export interface RecommendationCalculationInput {
  context: RecommendationWorkflowContext;
  bucket: string;
}

@Injectable()
export class RecommendationCalculationRunWorkflow extends RecommendationWorkflowBase<
  RecommendationCalculationInput,
  { runId: string | null }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationCalculationRun")
  async run(input: RecommendationCalculationInput): Promise<{ runId: string | null }> {
    const created = await this.createRun(input.context);
    if (!created.run || created.userErrors.length > 0) return { runId: null };
    try {
      let compute = await this.compute(input.context, created.run.runId);
      while (compute.phase !== "COMPLETE") {
        compute = await this.compute(input.context, created.run.runId);
      }
      await this.runTransition(input.context, created.run.runId, "READY", compute.counts);
      await this.runTransition(input.context, created.run.runId, "ACTIVE");
      for (const placement of ["PRODUCT_RELATED", "FREQUENTLY_BOUGHT_TOGETHER"] as const) {
        await this.startFanOut(input.context, placement, created.run.runId);
      }
      this.logger.log({
        storeId: input.context.storeId,
        runId: created.run.runId,
        modelVersion: created.run.algorithmVersion,
        productCount: compute.counts?.productCount,
        pairCount: compute.counts?.pairCount,
      }, "Recommendation calculation run activated");
      return { runId: created.run.runId };
    } catch (error) {
      await this.runTransition(
        input.context,
        created.run.runId,
        "FAILED",
        undefined,
        error instanceof RecommendationIntegrityError
          ? "INVALID_CALCULATION_RESULT"
          : "CALCULATION_FAILED",
      );
      this.logger.error({
        error,
        storeId: input.context.storeId,
        runId: created.run.runId,
        modelVersion: created.run.algorithmVersion,
      }, "Recommendation calculation run failed");
      throw error;
    }
  }

  @WorkflowStep()
  private createRun(context: RecommendationWorkflowContext) {
    return Kernel.getInstance().runScript(RecommendationCalculationRunCreateScript, {}, scriptContext(context));
  }

  @WorkflowStep({ timeoutMs: 60_000, retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private compute(context: RecommendationWorkflowContext, runId: string) {
    return Kernel.getInstance().runScript(RecommendationCalculationRunComputeScript, { runId }, scriptContext(context));
  }

  @WorkflowStep()
  private runTransition(
    context: RecommendationWorkflowContext,
    runId: string,
    transition: "READY" | "ACTIVE" | "FAILED",
    counts?: { productCount: number; pairCount: string },
    failureCode?: "CALCULATION_FAILED" | "INVALID_CALCULATION_RESULT",
  ) {
    return Kernel.getInstance().runScript(
      RecommendationCalculationRunTransitionScript,
      { runId, transition, counts, failureCode },
      scriptContext(context),
    );
  }

  @WorkflowStep()
  private async startFanOut(
    context: RecommendationWorkflowContext,
    placement: RecommendationPlacement,
    runId: string,
  ): Promise<void> {
    const payload: RecommendationFanOutInput = {
      context,
      placement,
      triggerKey: `calculation:${runId}`,
      calculationRunId: runId,
      includePopularityPolicies: true,
    };
    const idempotency = buildContext("recommendationCalculationFanOut", context, { placement, runId });
    const workflowId = buildIdempotencyKey("listing.recommendationSnapshotFanOut", idempotency);
    try {
      await this.broker.startWorkflow("listing.recommendationSnapshotFanOut", payload, idempotency, { workflowId });
    } catch (error) {
      if (!isDuplicateWorkflowStartError(error, workflowId)) throw error;
    }
  }
}

@Injectable()
export class RecommendationCalculationTriggerWorkflow extends RecommendationWorkflowBase<
  RecommendationCalculationInput,
  { started: boolean }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationCalculationTrigger")
  async run(input: RecommendationCalculationInput): Promise<{ started: boolean }> {
    const decision = await this.shouldRun(input.context);
    if (!decision.shouldRun) return { started: false };
    const idempotency = buildContext("recommendationCalculationRun", input.context, {
      bucket: input.bucket,
    });
    const workflowId = buildIdempotencyKey("listing.recommendationCalculationRun", idempotency);
    try {
      await this.broker.startWorkflow("listing.recommendationCalculationRun", input, idempotency, { workflowId });
    } catch (error) {
      if (!isDuplicateWorkflowStartError(error, workflowId)) throw error;
    }
    return { started: true };
  }

  @WorkflowStep()
  private shouldRun(context: RecommendationWorkflowContext) {
    return Kernel.getInstance().runScript(RecommendationCalculationShouldRunScript, {}, scriptContext(context));
  }
}

export interface RecommendationOrderIngestInput {
  context: RecommendationWorkflowContext;
  event: OrderSaleCommittedEvent | OrderSaleReversedEvent;
}

@Injectable()
export class RecommendationOrderFactIngestWorkflow extends RecommendationWorkflowBase<
  RecommendationOrderIngestInput,
  { status: "inserted" | "duplicate"; ingestionPosition: string }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationOrderFactIngest")
  async run(input: RecommendationOrderIngestInput) {
    return this.ingest(input);
  }

  @WorkflowStep({ retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private ingest(input: RecommendationOrderIngestInput) {
    return Kernel.getInstance().runScript(
      RecommendationOrderFactIngestScript,
      { event: input.event },
      scriptContext(input.context),
    );
  }
}

type PolicyUpsertInput = { context: RecommendationWorkflowContext; params: RecommendationPolicyUpsertParams };
type PolicyEnabledInput = { context: RecommendationWorkflowContext; params: { placement: RecommendationPlacement; enabled: boolean; expectedVersion: number } };
type ManualCreateInput = { context: RecommendationWorkflowContext; params: ManualRecommendationCreateParams };
type ManualUpdateInput = { context: RecommendationWorkflowContext; params: ManualRecommendationUpdateParams };
type ManualDeleteInput = { context: RecommendationWorkflowContext; params: { id: string; expectedVersion: number } };

@Injectable()
export class RecommendationMutationWorkflow extends RecommendationWorkflowBase {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationPolicyUpsert")
  @Policy<PolicyUpsertInput>({ resource: "store.data", action: "write", organizationId: (_s, i) => i.context.organizationId, domain: (_s, i) => `store:${i.context.storeId}` })
  async policyUpsert(input: PolicyUpsertInput): Promise<RecommendationPolicyResult> {
    const result = await this.policyUpsertStep(input);
    if (result.policy && result.generationTrigger) {
      await this.startPolicyFanOut(input.context, result.policy.placement, result.generationTrigger);
    }
    return result;
  }

  @Workflow("recommendationPolicySetEnabled")
  @Policy<PolicyEnabledInput>({ resource: "store.data", action: "admin", organizationId: (_s, i) => i.context.organizationId, domain: (_s, i) => `store:${i.context.storeId}` })
  async policySetEnabled(input: PolicyEnabledInput): Promise<RecommendationPolicyResult> {
    const result = await this.policyEnabledStep(input);
    if (result.policy?.enabled && result.generationTrigger) {
      await this.startPolicyFanOut(input.context, result.policy.placement, result.generationTrigger);
    }
    return result;
  }

  @Workflow("manualRecommendationCreate")
  @Policy<ManualCreateInput>({ resource: "store.data", action: "write", organizationId: (_s, i) => i.context.organizationId, domain: (_s, i) => `store:${i.context.storeId}` })
  async manualCreate(input: ManualCreateInput): Promise<ManualRecommendationResult> {
    const result = await this.manualCreateStep(input);
    await this.startManualBuild(input.context, result);
    return result;
  }

  @Workflow("manualRecommendationUpdate")
  @Policy<ManualUpdateInput>({ resource: "store.data", action: "write", organizationId: (_s, i) => i.context.organizationId, domain: (_s, i) => `store:${i.context.storeId}` })
  async manualUpdate(input: ManualUpdateInput): Promise<ManualRecommendationResult> {
    const result = await this.manualUpdateStep(input);
    await this.startManualBuild(input.context, result);
    return result;
  }

  @Workflow("manualRecommendationDelete")
  @Policy<ManualDeleteInput>({ resource: "store.data", action: "admin", organizationId: (_s, i) => i.context.organizationId, domain: (_s, i) => `store:${i.context.storeId}` })
  async manualDelete(input: ManualDeleteInput): Promise<ManualRecommendationResult> {
    const result = await this.manualDeleteStep(input);
    await this.startManualBuild(input.context, result);
    return result;
  }

  @WorkflowStep() private policyUpsertStep(input: PolicyUpsertInput) { return Kernel.getInstance().runScript(RecommendationPlacementPolicyUpsertScript, input.params, scriptContext(input.context)); }
  @WorkflowStep() private policyEnabledStep(input: PolicyEnabledInput) { return Kernel.getInstance().runScript(RecommendationPlacementPolicySetEnabledScript, input.params, scriptContext(input.context)); }
  @WorkflowStep() private manualCreateStep(input: ManualCreateInput) { return Kernel.getInstance().runScript(ManualProductRecommendationCreateScript, input.params, scriptContext(input.context)); }
  @WorkflowStep() private manualUpdateStep(input: ManualUpdateInput) { return Kernel.getInstance().runScript(ManualProductRecommendationUpdateScript, input.params, scriptContext(input.context)); }
  @WorkflowStep() private manualDeleteStep(input: ManualDeleteInput) { return Kernel.getInstance().runScript(ManualProductRecommendationDeleteScript, input.params, scriptContext(input.context)); }

  @WorkflowStep()
  private async startPolicyFanOut(context: RecommendationWorkflowContext, placement: RecommendationPlacement, triggerKey: string) {
    const input: RecommendationFanOutInput = { context, placement, triggerKey };
    const idempotency = buildContext("recommendationPolicyFanOut", context, { placement, triggerKey });
    const workflowId = buildIdempotencyKey("listing.recommendationSnapshotFanOut", idempotency);
    try { await this.broker.startWorkflow("listing.recommendationSnapshotFanOut", input, idempotency, { workflowId }); }
    catch (error) { if (!isDuplicateWorkflowStartError(error, workflowId)) throw error; }
  }

  @WorkflowStep()
  private async startManualBuild(context: RecommendationWorkflowContext, result: ManualRecommendationResult) {
    if (!result.anchorProductId || !result.placement || !result.generation || !result.triggerKey) return;
    await this.startBuild(context, {
      requestId: `${result.anchorProductId}:${result.placement}`,
      anchorProductId: result.anchorProductId,
      placement: result.placement,
      generation: result.generation,
      triggerKey: result.triggerKey,
    });
  }
}

function buildContext(operation: string, context: RecommendationWorkflowContext, payload: unknown): IdempotencyContext {
  return {
    source: "content",
    organizationId: context.organizationId,
    resourceId: context.storeId,
    operation: `listing.${operation}`,
    contentHash: hashContent({ version: 1, payload }),
  };
}

function buildLane(anchorProductId: string, placement: RecommendationPlacement): string {
  const hash = hashContent(`${anchorProductId}:${placement}`);
  return `lane-${Number.parseInt(hash.slice(0, 8), 16) % 2}`;
}

function failureCode(error: unknown): string {
  const candidate = error as { code?: string };
  return ["STALE_INPUT", "UNSUPPORTED_MODEL_VERSION", "CANDIDATE_LIMIT_EXCEEDED", "INVALID_SNAPSHOT_CONTENT"].includes(candidate.code ?? "")
    ? candidate.code!
    : "SNAPSHOT_BUILD_FAILED";
}

export interface RecommendationReferenceStateSyncInput {
  context: RecommendationWorkflowContext;
  plan: import("../scripts/ListingWriteIndexActionScript.js").RecommendationLifecyclePlan;
}

@Injectable()
export class RecommendationReferenceStateSyncWorkflow extends RecommendationWorkflowBase<
  RecommendationReferenceStateSyncInput,
  { requested: number }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationReferenceStateSync")
  async run(input: RecommendationReferenceStateSyncInput): Promise<{ requested: number }> {
    const direct = await this.syncState(input);
    for (const request of direct.requests) await this.startBuild(input.context, request);
    let requested = direct.requests.length;
    const eligibilityChanged =
      input.plan.oldState.published !== input.plan.newState.published ||
      input.plan.oldState.available !== input.plan.newState.available;
    if (eligibilityChanged) requested += await this.processAffected(input, "reverse");
    if (categoryChanged(input.plan)) requested += await this.processAffected(input, "category");
    const becameEligible = (!input.plan.oldState.published || !input.plan.oldState.available) &&
      input.plan.newState.published && input.plan.newState.available;
    if (becameEligible) {
      for (const placement of ["PRODUCT_RELATED", "FREQUENTLY_BOUGHT_TOGETHER"] as const) {
        await this.startLifecycleFanOut(input, placement);
      }
    }
    return { requested };
  }

  private async processAffected(input: RecommendationReferenceStateSyncInput, mode: "reverse" | "category") {
    let afterProductId: string | undefined;
    let requested = 0;
    do {
      const page = await this.affectedPage(input, mode, afterProductId);
      for (const request of page.requests) await this.startBuild(input.context, request);
      requested += page.requests.length;
      afterProductId = page.nextCursor ?? undefined;
    } while (afterProductId);
    return requested;
  }

  @WorkflowStep()
  private syncState(input: RecommendationReferenceStateSyncInput) {
    return Kernel.getInstance().runScript(
      RecommendationReferenceStateSyncScript,
      { plan: input.plan },
      scriptContext(input.context),
    );
  }

  @WorkflowStep()
  private affectedPage(
    input: RecommendationReferenceStateSyncInput,
    mode: "reverse" | "category",
    afterProductId?: string,
  ) {
    return Kernel.getInstance().runScript(
      RecommendationLifecycleAffectedPageScript,
      { plan: input.plan, mode, afterProductId },
      scriptContext(input.context),
    );
  }

  @WorkflowStep()
  private async startLifecycleFanOut(
    input: RecommendationReferenceStateSyncInput,
    placement: RecommendationPlacement,
  ): Promise<void> {
    const fanOut: RecommendationFanOutInput = {
      context: input.context,
      placement,
      triggerKey: `lifecycle:${input.plan.productId}:${input.plan.eventSequence}`,
      requiredFallbackCode: "store_popularity",
    };
    const idempotency = buildContext("recommendationLifecycleFanOut", input.context, {
      productId: input.plan.productId,
      eventSequence: input.plan.eventSequence,
      placement,
    });
    const workflowId = buildIdempotencyKey("listing.recommendationSnapshotFanOut", idempotency);
    try { await this.broker.startWorkflow("listing.recommendationSnapshotFanOut", fanOut, idempotency, { workflowId }); }
    catch (error) { if (!isDuplicateWorkflowStartError(error, workflowId)) throw error; }
  }
}

function categoryChanged(plan: import("../scripts/ListingWriteIndexActionScript.js").RecommendationLifecyclePlan): boolean {
  return plan.oldState.categoryIds.join("\0") !== plan.newState.categoryIds.join("\0");
}

export interface RecommendationManualScheduleInput {
  context: RecommendationWorkflowContext;
  toBoundary: string;
}

export interface RecommendationManualBootstrapInput {
  context: RecommendationWorkflowContext;
  cutoff: string;
}

@Injectable()
export class RecommendationManualBootstrapWorkflow extends RecommendationWorkflowBase<
  RecommendationManualBootstrapInput,
  { requested: number; status: string }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationManualBootstrap")
  async run(input: RecommendationManualBootstrapInput): Promise<{ requested: number; status: string }> {
    const triggerKey = `schedule-bootstrap:${input.cutoff}`;
    let after: { anchorProductId: string; placement: RecommendationPlacement } | undefined;
    let requested = 0;
    do {
      const page = await this.page(input, triggerKey, after);
      for (const request of page.requests) await this.startBuild(input.context, request);
      requested += page.requests.length;
      after = page.nextCursor ?? undefined;
    } while (after);
    const completed = await this.complete(input);
    return { requested, status: completed.status };
  }

  @WorkflowStep()
  private page(
    input: RecommendationManualBootstrapInput,
    triggerKey: string,
    after?: { anchorProductId: string; placement: RecommendationPlacement },
  ) {
    return Kernel.getInstance().runScript(
      RecommendationMaintenanceRequestPageScript,
      { mode: "bootstrap", triggerKey, after },
      scriptContext(input.context),
    );
  }

  @WorkflowStep()
  private complete(input: RecommendationManualBootstrapInput) {
    return Kernel.getInstance().runScript(
      RecommendationMaintenanceCompleteScript,
      { mode: "bootstrap", cutoff: input.cutoff },
      scriptContext(input.context),
    );
  }
}

@Injectable()
export class RecommendationManualScheduleWorkflow extends RecommendationWorkflowBase<
  RecommendationManualScheduleInput,
  { requested: number; status: string }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationManualSchedule")
  async run(input: RecommendationManualScheduleInput): Promise<{ requested: number; status: string }> {
    let state = await this.open(input);
    if (state.status === "BOOTSTRAPPING") {
      await this.startBootstrap(input.context, state.cutoff);
      return { requested: 0, status: "BOOTSTRAPPING" };
    }
    let requested = 0;
    while (true) {
      const triggerKey = `schedule:${state.fromBoundary}:${state.toBoundary}`;
      let after: { anchorProductId: string; placement: RecommendationPlacement } | undefined;
      do {
        const page = await this.maintenancePage(input.context, {
          mode: "interval",
          triggerKey,
          fromBoundary: state.fromBoundary,
          toBoundary: state.toBoundary,
          after,
        });
        for (const request of page.requests) await this.startBuild(input.context, request);
        requested += page.requests.length;
        after = page.nextCursor ?? undefined;
      } while (after);
      const completed = await this.completeMaintenance(input.context, {
        mode: "interval",
        fromBoundary: state.fromBoundary,
        toBoundary: state.toBoundary,
      });
      if (completed.status !== "CONFLICT") {
        return { requested, status: completed.status };
      }
      state = await this.open(input);
      if (state.status === "BOOTSTRAPPING") {
        await this.startBootstrap(input.context, state.cutoff);
        return { requested, status: "BOOTSTRAPPING" };
      }
    }
  }

  @WorkflowStep()
  private open(input: RecommendationManualScheduleInput) {
    return Kernel.getInstance().runScript(
      RecommendationMaintenanceOpenScript,
      { toBoundary: input.toBoundary },
      scriptContext(input.context),
    );
  }

  @WorkflowStep()
  private async startBootstrap(
    context: RecommendationWorkflowContext,
    cutoff: string,
  ): Promise<void> {
    const input: RecommendationManualBootstrapInput = { context, cutoff };
    const idempotency = buildContext("recommendationManualBootstrap", context, { cutoff });
    const workflowId = buildIdempotencyKey("listing.recommendationManualBootstrap", idempotency);
    try {
      await this.broker.startWorkflow(
        "listing.recommendationManualBootstrap",
        input,
        idempotency,
        { workflowId },
      );
    } catch (error) {
      if (!isDuplicateWorkflowStartError(error, workflowId)) throw error;
    }
  }

  @WorkflowStep()
  private maintenancePage(
    context: RecommendationWorkflowContext,
    params: Parameters<RecommendationMaintenanceRequestPageScript["run"]>[0],
  ) {
    return Kernel.getInstance().runScript(RecommendationMaintenanceRequestPageScript, params, scriptContext(context));
  }

  @WorkflowStep()
  private completeMaintenance(
    context: RecommendationWorkflowContext,
    params: Parameters<RecommendationMaintenanceCompleteScript["run"]>[0],
  ) {
    return Kernel.getInstance().runScript(RecommendationMaintenanceCompleteScript, params, scriptContext(context));
  }
}

export interface RecommendationGlobalTriggerInput {
  kind: "calculation" | "manual";
  bucket: string;
}

@Injectable()
export class RecommendationGlobalTriggerWorkflow extends RecommendationWorkflowBase<
  RecommendationGlobalTriggerInput,
  { stores: number }
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) { super(broker); }

  @Workflow("recommendationGlobalTrigger")
  async run(input: RecommendationGlobalTriggerInput): Promise<{ stores: number }> {
    let afterStoreId: string | undefined;
    let stores = 0;
    do {
      const page = await this.listStores(afterStoreId);
      for (const store of page.stores) {
        await this.startStoreWorkflow(input, store);
        stores += 1;
      }
      afterStoreId = page.nextCursor ?? undefined;
    } while (afterStoreId);
    return { stores };
  }

  @WorkflowStep({ retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 } })
  private listStores(afterStoreId?: string) {
    return this.broker.call<
      import("@shopana/broker-types").ListActiveStoresResult,
      import("@shopana/broker-types").ListActiveStoresParams
    >("project.listActiveStores", { afterStoreId, first: 500 });
  }

  @WorkflowStep()
  private async startStoreWorkflow(
    input: RecommendationGlobalTriggerInput,
    store: import("@shopana/broker-types").ActiveStoreWorkflowContext,
  ): Promise<void> {
    const context: RecommendationWorkflowContext = {
      storeId: store.storeId,
      organizationId: store.organizationId,
      requestId: `recommendation-${input.kind}:${input.bucket}`,
    };
    const workflowName = input.kind === "calculation"
      ? "listing.recommendationCalculationTrigger"
      : "listing.recommendationManualSchedule";
    const workflowInput = input.kind === "calculation"
      ? { context, bucket: input.bucket }
      : { context, toBoundary: input.bucket };
    const idempotency = buildContext(`recommendation-${input.kind}`, context, { bucket: input.bucket });
    const workflowId = buildIdempotencyKey(workflowName, idempotency);
    try {
      await this.broker.startWorkflow(workflowName, workflowInput, idempotency, { workflowId });
    } catch (error) {
      if (!isDuplicateWorkflowStartError(error, workflowId)) throw error;
    }
  }
}
