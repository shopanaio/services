import { Injectable } from "@nestjs/common";
import type {
  AppBroker,
  AppDeploymentConfig,
  AppRuntimeHealth,
  AppRuntimeStatus,
  ShopanaApp,
  ShopanaAppDefinition,
} from "@shopana/app-sdk";

export interface AppRuntimeRecord {
  readonly definition: ShopanaAppDefinition;
  readonly app: ShopanaApp;
  readonly broker: AppBroker;
  readonly config: AppDeploymentConfig;
  status: AppRuntimeStatus;
  error?: Error;
}

@Injectable()
export class AppRuntimeRegistry {
  private readonly records = new Map<string, AppRuntimeRecord>();

  register(record: Omit<AppRuntimeRecord, "status">): AppRuntimeRecord {
    const appCode = record.definition.manifest.code;
    if (this.records.has(appCode)) {
      throw new Error(`App runtime "${appCode}" already registered`);
    }
    const runtime = { ...record, status: "REGISTERED" as const };
    this.records.set(appCode, runtime);
    return runtime;
  }

  get(appCode: string): AppRuntimeRecord | undefined {
    return this.records.get(appCode);
  }

  list(): readonly AppRuntimeRecord[] {
    return [...this.records.values()];
  }

  async health(appCode: string): Promise<AppRuntimeHealth> {
    const runtime = this.records.get(appCode);
    if (!runtime) {
      return { status: "unhealthy", message: "App runtime is not registered" };
    }
    if (runtime.status !== "READY") {
      return {
        status: "unhealthy",
        message: `App runtime status is ${runtime.status}`,
      };
    }
    return runtime.app.health();
  }

  remove(appCode: string): void {
    this.records.delete(appCode);
  }
}
