import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DBOS } from "@shopana/shared-kernel";
import { Kernel } from '../kernel/Kernel.js';
import type { FileGarbageCollectorSaga } from '../sagas/index.js';

/**
 * Scheduled service for file garbage collection.
 *
 * Runs hourly to:
 * 1. Reset stuck files in DELETING state (>6 hours) back to SOFT_DELETED
 * 2. Hard delete files that have been soft-deleted for >30 days
 *
 * Sagas are registered by MediaNestService during startup.
 */
@Injectable()
export class FileGarbageCollectorScheduler {
  private readonly logger = new Logger(FileGarbageCollectorScheduler.name);

  @Cron(CronExpression.EVERY_HOUR)
  async handleGarbageCollection(): Promise<void> {
    if (!Kernel.isInitialized()) {
      this.logger.warn('Kernel not initialized, skipping GC run');
      return;
    }

    const kernel = Kernel.getInstance();
    const workflowRegistry = kernel.workflow;
    const sagaName = kernel.getServices().broker.qualifyAction(
      "fileGarbageCollector"
    );

    if (!workflowRegistry.has(sagaName)) {
      this.logger.warn('fileGarbageCollector saga not registered, skipping run');
      return;
    }

    const saga = workflowRegistry.get<FileGarbageCollectorSaga>(sagaName);

    this.logger.debug('Starting garbage collection run');

    try {
      await DBOS.startWorkflow(saga).run();
      this.logger.debug('Garbage collection run completed');
    } catch (error) {
      this.logger.error('Failed to run garbage collection saga', error);
    }
  }
}
