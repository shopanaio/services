import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DBOS } from "@shopana/shared-kernel";
import { Kernel } from '../kernel/Kernel.js';
import type { FileGarbageCollectorWorkflow } from '../workflows/index.js';

/**
 * Scheduled service for file garbage collection.
 *
 * Runs hourly to:
 * 1. Reset stuck files in DELETING state (>6 hours) back to SOFT_DELETED
 * 2. Hard delete files that have been soft-deleted for >30 days
 *
 * Workflows are registered by MediaNestService during startup.
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
    const workflowName = kernel.getServices().broker.qualifyAction(
      "fileGarbageCollector"
    );

    if (!workflowRegistry.has(workflowName)) {
      this.logger.warn('fileGarbageCollector workflow not registered, skipping run');
      return;
    }

    const workflow = workflowRegistry.get<FileGarbageCollectorWorkflow>(
      workflowName
    );

    this.logger.debug('Starting garbage collection run');

    try {
      await DBOS.startWorkflow(workflow).run();
      this.logger.debug('Garbage collection run completed');
    } catch (error) {
      this.logger.error('Failed to run garbage collection workflow', error);
    }
  }
}
