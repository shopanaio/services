import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import type { Kernel } from "../kernel/Kernel.js";
import type { MediaKernelServices } from "../kernel/types.js";

export interface SagaServices {
  kernel: Kernel;
}

/**
 * Base class for sagas in media service.
 * Extends ConfiguredInstance for DBOS decorator support.
 */
export abstract class BaseSaga extends ConfiguredInstance {
  protected readonly kernel: Kernel;

  constructor(name: string, services: SagaServices) {
    super(name);
    this.kernel = services.kernel;
  }

  protected get services(): MediaKernelServices {
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
