import { DBOS } from "@shopana/workflows";
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
    const fileRepo = this.repository.file;

    let totalStuck = 0;
    for (let i = 0; i < MAX_RESET_BATCHES; i++) {
      const count = await fileRepo.resetStuckDeleting({
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

    let batchesProcessed = 0;
    while (batchesProcessed < MAX_GC_BATCHES) {
      const batch = await fileRepo.findSoftDeletedForGC({
        cutoffDate: daysAgo(RETENTION_DAYS),
        errorCooldown: hoursAgo(ERROR_COOLDOWN_HOURS),
        limit: BATCH_LIMIT,
      });

      if (batch.length === 0) {
        break;
      }

      await pMap(
        batch,
        async (file) => {
          try {
            await this.startHardDeleteWorkflow(file.id);
          } catch (error) {
            logger.error(
              { fileId: file.id, error },
              "Failed to start hard delete workflow"
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
