import { DBOS } from "@shopana/shared-kernel";
import pMap from "p-map";
import { BaseWorkflow, type WorkflowServices } from "./BaseWorkflow.js";

const STUCK_TIMEOUT_HOURS = 6;
const ERROR_COOLDOWN_HOURS = 6;
const RETENTION_DAYS = 30;
const BATCH_LIMIT = 100;
const MAX_RESET_BATCHES = 10;
const MAX_GC_BATCHES = 50;
const PARALLEL_WORKFLOWS = 10;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

interface Dependencies extends WorkflowServices {
  startHardDeleteWorkflow: (fileId: string) => Promise<void>;
}

export class FileGarbageCollectorWorkflow extends BaseWorkflow {
  private readonly startHardDeleteWorkflow: (fileId: string) => Promise<void>;

  constructor(name: string, deps: Dependencies) {
    super(name, { kernel: deps.kernel });
    this.startHardDeleteWorkflow = deps.startHardDeleteWorkflow;
  }

  @DBOS.workflow()
  async run(): Promise<void> {
    const logger = DBOS.logger;
    const fileDeletionStateRepo = this.repository.fileDeletionState;

    // Phase 1: Reset stuck DELETING -> SOFT_DELETED (with error marking)
    let totalStuck = 0;
    for (let i = 0; i < MAX_RESET_BATCHES; i++) {
      const count = await fileDeletionStateRepo.resetStuckDeleting({
        stuckSince: hoursAgo(STUCK_TIMEOUT_HOURS),
        limit: BATCH_LIMIT,
      });
      totalStuck += count;
      if (count === 0) {
        break;
      }
    }
    if (totalStuck > 0) {
      logger.warn(
        `Reset ${totalStuck} stuck DELETING files (marked as RETRYABLE)`
      );
    }

    // Phase 2: Pick SOFT_DELETED files for hard delete
    let batchesProcessed = 0;
    while (batchesProcessed < MAX_GC_BATCHES) {
      const batch = await fileDeletionStateRepo.findSoftDeletedForGC({
        cutoffDate: daysAgo(RETENTION_DAYS),
        errorCooldown: hoursAgo(ERROR_COOLDOWN_HOURS),
        limit: BATCH_LIMIT,
      });

      if (batch.length === 0) {
        break;
      }

      await pMap(
        batch,
        async (deletionState) => {
          try {
            await this.startHardDeleteWorkflow(deletionState.fileId);
          } catch (error) {
            logger.error(
              `Failed to start hard delete workflow for fileId=${deletionState.fileId}: ${error}`
            );
          }
        },
        { concurrency: PARALLEL_WORKFLOWS, stopOnError: false }
      );

      batchesProcessed++;
    }

    if (batchesProcessed === MAX_GC_BATCHES) {
      logger.info(
        `GC hit max batches limit (${MAX_GC_BATCHES}), will continue next run`
      );
    }
  }
}
