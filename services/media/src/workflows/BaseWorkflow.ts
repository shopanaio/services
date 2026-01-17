import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import type { Kernel } from "../kernel/Kernel.js";
import type { MediaKernelServices } from "../kernel/types.js";

export interface WorkflowServices {
  kernel: Kernel;
}

/**
 * Base class for durable workflows in media service.
 * Extends ConfiguredInstance for DBOS decorator support.
 */
export abstract class BaseWorkflow extends ConfiguredInstance {
  protected readonly kernel: Kernel;

  constructor(name: string, services: WorkflowServices) {
    super(name);
    this.kernel = services.kernel;
  }

  protected get services(): MediaKernelServices {
    return this.kernel.getServices();
  }

  protected get repository() {
    return this.services.repository;
  }

  protected get logger() {
    return this.services.logger;
  }
}
