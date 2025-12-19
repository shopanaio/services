import type { Kernel } from '@shopana/shared-kernel';
import type { WorkflowServices } from './types.js';

/**
 * Base class for durable workflows.
 */
export abstract class BaseWorkflow<TServices extends WorkflowServices = WorkflowServices> {
  protected readonly kernel: Kernel;

  constructor(services: TServices) {
    this.kernel = services.kernel;
  }
}
