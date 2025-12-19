import type { Kernel } from "../kernel/Kernel.js";
import type { ProjectKernelServices } from "../kernel/types.js";

export interface WorkflowServices {
  kernel: Kernel;
}

/**
 * Base class for durable workflows in project service.
 */
export abstract class BaseWorkflow {
  protected readonly kernel: Kernel;

  constructor(services: WorkflowServices) {
    this.kernel = services.kernel;
  }

  protected get services(): ProjectKernelServices {
    return this.kernel.getServices();
  }

  protected get repository() {
    return this.services.repository;
  }

  protected get broker() {
    return this.services.broker;
  }
}
