import {
  validatePersistedSegmentDefinition,
  type SegmentDefinitionV1,
  type SegmentStoreEvaluationContext,
} from "@shopana/customer-segment-dsl";
import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  CustomerSegment,
  CustomerSegmentMaterializationRun,
  CustomerSegmentReevaluationQueue,
  CustomerSegmentTemporalSchedule,
} from "../../repositories/models/index.js";
import type { Repository } from "../../repositories/Repository.js";
import { encodeCustomerIdCursor } from "../../repositories/customer/CustomerRepository.js";
import { CUSTOMER_SEGMENT_REGISTRY } from "../../segments/registry.js";

export interface CustomerSegmentWorkerParams {
  readonly workerId: string;
}

export interface CustomerSegmentWorkerResult {
  readonly state: "IDLE" | "MORE" | "WAITING" | "READY";
  readonly processed: number;
}

export class CustomerSegmentMaterializationPageScript extends BaseScript<
  CustomerSegmentWorkerParams,
  CustomerSegmentWorkerResult
> {
  protected async execute(
    params: CustomerSegmentWorkerParams,
  ): Promise<CustomerSegmentWorkerResult> {
    const run = await this.repository.segmentMaterialization.claimRun(
      params.workerId,
      lease(5),
    );
    if (!run) return { state: "IDLE", processed: 0 };
    try {
      const segment = await this.repository.segmentMaterialization.currentGeneration(
        run.segmentId,
      );
      if (!isCurrentRun(segment, run)) {
        await this.repository.segmentMaterialization.failRun(
          run,
          new Error("Materialization generation was superseded"),
        );
        return { state: "READY", processed: 0 };
      }
      const storeContext = await segmentStoreContext(
        this.repository,
        this.context.store.id,
      );
      const definition = validatePersistedSegmentDefinition(
        segment.definition,
        CUSTOMER_SEGMENT_REGISTRY,
        storeContext,
      );
      if (run.scanCompletedAt === null) {
        const customerIds = await this.repository.customer.scanIds(
          run.scanCursor,
          500,
        );
        let renewAt = Date.now() + 20_000;
        for (const customerId of customerIds) {
          await evaluatePair(
            this.repository,
            segment,
            definition,
            storeContext,
            customerId,
            run.scanEffectiveAt,
            run.causeSequence,
            null,
            null,
            null,
          );
          if (Date.now() >= renewAt) {
            const renewed = await this.repository.segmentMaterialization.renewRunLease(
              run.id,
              params.workerId,
              lease(1),
            );
            if (!renewed) throw new Error("Customer segment materialization lease was lost");
            renewAt = Date.now() + 20_000;
          }
        }
        if (customerIds.length === 500) {
          await this.repository.segmentMaterialization.advanceRun(
            run.id,
            encodeCustomerIdCursor(customerIds.at(-1)!),
          );
          return { state: "MORE", processed: customerIds.length };
        }
        const finalization = await this.repository.segmentMaterialization.finishScan(
          run.id,
        );
        const finished = {
          ...run,
          scanCompletedAt: finalization.publicationEffectiveAt,
          queueWatermark: finalization.watermark,
          publicationEffectiveAt: finalization.publicationEffectiveAt,
        };
        const drained = await drainPublicationTemporal(
          this.repository,
          finished,
          params.workerId,
          storeContext,
        );
        if (drained > 0) {
          return { state: "MORE", processed: customerIds.length + drained };
        }
        if (!(await this.repository.segmentMaterialization.barrierPassed(finished))) {
          return { state: "WAITING", processed: customerIds.length };
        }
        await this.repository.segmentMaterialization.publishRun(finished);
        return { state: "READY", processed: customerIds.length };
      }
      const drained = await drainPublicationTemporal(
        this.repository,
        run,
        params.workerId,
        storeContext,
      );
      if (drained > 0) return { state: "MORE", processed: drained };
      if (!(await this.repository.segmentMaterialization.barrierPassed(run))) {
        return { state: "WAITING", processed: 0 };
      }
      await this.repository.segmentMaterialization.publishRun(run);
      return { state: "READY", processed: 0 };
    } catch (error) {
      const terminal = await this.repository.segmentMaterialization.recordRunFailure(
        run,
        error,
      );
      return { state: terminal ? "READY" : "IDLE", processed: 0 };
    }
  }

  protected handleError(error: unknown): CustomerSegmentWorkerResult {
    throw error;
  }
}

export class CustomerSegmentReevaluationBatchScript extends BaseScript<
  CustomerSegmentWorkerParams,
  CustomerSegmentWorkerResult
> {
  protected async execute(
    params: CustomerSegmentWorkerParams,
  ): Promise<CustomerSegmentWorkerResult> {
    const items = await this.repository.segmentMaterialization.claimQueue(
      params.workerId,
      lease(5),
    );
    if (items.length === 0) return { state: "IDLE", processed: 0 };
    const storeContext = await segmentStoreContext(
      this.repository,
      this.context.store.id,
    );
    for (const item of items) {
      try {
        await evaluateQueueItem(this.repository, item, storeContext);
      } catch (error) {
        await this.repository.segmentMaterialization.failQueue(item, error);
      }
    }
    return { state: items.length === 100 ? "MORE" : "READY", processed: items.length };
  }

  protected handleError(error: unknown): CustomerSegmentWorkerResult {
    throw error;
  }
}

export class CustomerSegmentTemporalBatchScript extends BaseScript<
  CustomerSegmentWorkerParams,
  CustomerSegmentWorkerResult
> {
  protected async execute(
    params: CustomerSegmentWorkerParams,
  ): Promise<CustomerSegmentWorkerResult> {
    const items = await this.repository.segmentMaterialization.claimTemporal(
      params.workerId,
      lease(5),
    );
    if (items.length === 0) return { state: "IDLE", processed: 0 };
    const storeContext = await segmentStoreContext(
      this.repository,
      this.context.store.id,
    );
    for (const item of items) {
      try {
        await evaluateTemporalItem(this.repository, item, storeContext);
      } catch (error) {
        await this.repository.segmentMaterialization.failTemporal(item, error);
      }
    }
    return { state: items.length === 100 ? "MORE" : "READY", processed: items.length };
  }

  protected handleError(error: unknown): CustomerSegmentWorkerResult {
    throw error;
  }
}

async function evaluateQueueItem(
  repository: Repository,
  item: CustomerSegmentReevaluationQueue,
  storeContext: SegmentStoreEvaluationContext,
): Promise<void> {
  const segment = await repository.segmentMaterialization.currentGeneration(item.segmentId);
  const completedAt = new Date().toISOString();
  if (
    !segment ||
    segment.definitionRevision !== item.definitionRevision ||
    segment.evaluationGeneration !== item.evaluationGeneration ||
    segment.status !== "ACTIVE"
  ) {
    await repository.segmentMaterialization.completeQueue(item.sequence, completedAt);
    return;
  }
  const definition = validatePersistedSegmentDefinition(
    segment.definition,
    CUSTOMER_SEGMENT_REGISTRY,
    storeContext,
  );
  await evaluatePair(
    repository,
    segment,
    definition,
    storeContext,
    item.customerId,
    item.requestedEffectiveAt,
    item.sequence,
    item.sourceEventId,
    item.sequence,
    null,
  );
}

async function evaluateTemporalItem(
  repository: Repository,
  item: CustomerSegmentTemporalSchedule,
  storeContext: SegmentStoreEvaluationContext,
  fixedEffectiveAt?: string,
): Promise<void> {
  const segment = await repository.segmentMaterialization.currentGeneration(item.segmentId);
  if (
    !segment ||
    segment.definitionRevision !== item.definitionRevision ||
    segment.evaluationGeneration !== item.evaluationGeneration ||
    segment.status !== "ACTIVE"
  ) {
    await repository.segmentMaterialization.deleteTemporal(item.id, item.scheduleToken);
    return;
  }
  const effectiveAt = fixedEffectiveAt ?? new Date().toISOString();
  const definition = validatePersistedSegmentDefinition(
    segment.definition,
    CUSTOMER_SEGMENT_REGISTRY,
    storeContext,
  );
  await evaluatePair(
    repository,
    segment,
    definition,
    storeContext,
    item.customerId,
    effectiveAt,
    await repository.segmentMaterialization.allocateCauseSequence(),
    `temporal:${item.scheduleToken}`,
    null,
    item.scheduleToken,
  );
}

async function drainPublicationTemporal(
  repository: Repository,
  run: CustomerSegmentMaterializationRun,
  workerId: string,
  storeContext: SegmentStoreEvaluationContext,
): Promise<number> {
  if (!run.publicationEffectiveAt) return 0;
  const items = await repository.segmentMaterialization.claimTemporalForPublication(
    run,
    workerId,
    lease(1),
  );
  for (const item of items) {
    try {
      await evaluateTemporalItem(
        repository,
        item,
        storeContext,
        run.publicationEffectiveAt,
      );
    } catch (error) {
      await repository.segmentMaterialization.failTemporal(item, error);
    }
  }
  return items.length;
}

async function evaluatePair(
  repository: Repository,
  segment: CustomerSegment,
  definition: SegmentDefinitionV1,
  storeContext: SegmentStoreEvaluationContext,
  customerId: string,
  effectiveAt: string,
  causeSequence: bigint,
  sourceEventId: string | null,
  queueSequence: bigint | null,
  expectedScheduleToken: string | null,
): Promise<void> {
  await repository.segmentMaterialization.applyEvaluation({
    segment,
    definition,
    storeContext,
    customerId,
    effectiveAt,
    causeSequence,
    sourceEventId,
    queueSequence,
    expectedScheduleToken,
  });
}

async function segmentStoreContext(
  repository: Repository,
  storeId: string,
): Promise<SegmentStoreEvaluationContext> {
  const store = await repository.segmentStoreContext.findByStoreId(storeId);
  if (
    !store ||
    !Number.isSafeInteger(store.currencyExponent) ||
    !Number.isSafeInteger(store.configurationRevision)
  ) {
    throw new Error("Owned Store segment context is not ready");
  }
  return {
    storeId: store.storeId,
    currencyCode: store.currencyCode,
    currencyExponent: store.currencyExponent,
    timeZone: store.timeZone,
    configurationRevision: store.configurationRevision,
  };
}

function isCurrentRun(
  segment: CustomerSegment | null,
  run: CustomerSegmentMaterializationRun,
): segment is CustomerSegment {
  return Boolean(
    segment &&
    segment.type === "DYNAMIC" &&
    segment.status === "ACTIVE" &&
    segment.definitionRevision === run.definitionRevision &&
    segment.evaluationGeneration === run.evaluationGeneration,
  );
}

function lease(_minutes: number): string {
  return new Date(Date.now() + 60_000).toISOString();
}
