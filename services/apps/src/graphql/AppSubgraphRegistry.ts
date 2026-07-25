import { Injectable } from "@nestjs/common";
import type { AppGraphQLServer } from "@shopana/app-sdk";

export type AppGraphQLSurface = "admin" | "storefront";

export interface AppSubgraphRuntime {
  readonly appCode: string;
  readonly surface: AppGraphQLSurface;
  readonly origin: string;
  readonly server: AppGraphQLServer;
}

@Injectable()
export class AppSubgraphRegistry {
  private readonly runtimes = new Map<string, AppSubgraphRuntime>();

  register(runtime: AppSubgraphRuntime): void {
    const key = this.key(runtime.appCode, runtime.surface);
    if (this.runtimes.has(key)) {
      throw new Error(`App subgraph "${key}" is already registered`);
    }
    this.runtimes.set(key, runtime);
  }

  get(
    appCode: string,
    surface: AppGraphQLSurface,
  ): AppSubgraphRuntime | undefined {
    return this.runtimes.get(this.key(appCode, surface));
  }

  remove(appCode: string, surface: AppGraphQLSurface): void {
    this.runtimes.delete(this.key(appCode, surface));
  }

  list(): readonly AppSubgraphRuntime[] {
    return [...this.runtimes.values()];
  }

  private key(appCode: string, surface: AppGraphQLSurface): string {
    return `${appCode}:${surface}`;
  }
}
