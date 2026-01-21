import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import { Kernel } from '../kernel/Kernel.js';
import type { FileGarbageCollectorOutput } from '../sagas/index.js';

/**
 * Scheduled service for file garbage collection.
 *
 * Runs hourly to:
 * 1. Reset stuck files in DELETING state (>6 hours) back to SOFT_DELETED
 * 2. Hard delete files that have been soft-deleted for >30 days
 */
@Injectable()
export class FileGarbageCollectorScheduler {
  private readonly logger = new Logger(FileGarbageCollectorScheduler.name);

  constructor(
    @InjectBroker('media') private readonly broker: ServiceBroker
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleGarbageCollection(): Promise<void> {
    if (!Kernel.isInitialized()) {
      this.logger.warn('Kernel not initialized, skipping GC run');
      return;
    }

    this.logger.debug('Starting garbage collection run');

    try {
      const result = await this.broker.runSaga<FileGarbageCollectorOutput, void>(
        "fileGarbageCollector",
        undefined,
        {
          source: "workflow",
          workflowId: `gc:scheduled:${Date.now()}`,
          stepId: "run",
        }
      );

      if (result.success) {
        this.logger.debug(
          `Garbage collection completed: ${result.data?.stuckReset} stuck reset, ${result.data?.batchesProcessed} batches processed`
        );
      } else {
        this.logger.warn('Garbage collection completed with errors', result.error);
      }
    } catch (error) {
      this.logger.error('Failed to run garbage collection saga', error);
    }
  }
}
