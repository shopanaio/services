import type { KernelServices, TransactionScript, Logger, PluginManager } from "./types";
import type { ResilienceRunner } from "@shopana/plugin-sdk";

export class Kernel {
  private readonly services: KernelServices;

  constructor(pluginManager: PluginManager, broker: any, logger: Logger, runner?: ResilienceRunner) {
    this.services = { pluginManager, broker, logger, runner };
  }

  getServices(): KernelServices { return this.services; }

  async executeScript<TParams, TResult>(script: TransactionScript<TParams, TResult>, params: TParams): Promise<TResult> {
    return script(params, this.services);
  }

  async getPluginInfo() {
    const manifests = this.services.pluginManager.listManifests();
    const health = await this.services.pluginManager.health();
    return { manifests, health, count: manifests.length };
  }
}

export type { KernelServices, TransactionScript } from "./types";
