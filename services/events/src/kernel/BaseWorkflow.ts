import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import type { Kernel } from "./Kernel.js";
import type { EventsKernelServices } from "./types.js";

export interface WorkflowServices {
  kernel: Kernel;
}

export abstract class BaseWorkflow extends ConfiguredInstance {
  protected readonly kernel: Kernel;

  constructor(name: string, services: WorkflowServices) {
    super(name);
    this.kernel = services.kernel;
  }

  protected get services(): EventsKernelServices {
    return this.kernel.getServices();
  }

  protected get repository() {
    return this.services.repository;
  }

  protected get broker() {
    return this.services.broker;
  }

  protected get logger() {
    return this.services.logger;
  }
}
