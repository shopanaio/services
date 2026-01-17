import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DBOS } from '@shopana/workflows';
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

    const workflowRegistry = Kernel.getInstance().workflow;

    if (!workflowRegistry.has('fileGarbageCollector')) {
      this.logger.warn('fileGarbageCollector workflow not registered, skipping run');
      return;
    }

    const workflow = workflowRegistry.get<FileGarbageCollectorWorkflow>('fileGarbageCollector');

    this.logger.debug('Starting garbage collection run');

    try {
      await DBOS.startWorkflow(workflow).run();
      this.logger.debug('Garbage collection run completed');
    } catch (error) {
      this.logger.error('Failed to run garbage collection workflow', error);
    }
  }
}
