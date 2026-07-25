import type { AdminAppSdk } from "../../sdk";
import type { AdminAppUiDescriptor } from "../descriptor-schema";
import type { AppRuntimeScope } from "../app-runtime-scope";

export interface ActiveAdminApp {
  descriptor: AdminAppUiDescriptor;
  scope: AppRuntimeScope;
  sdk: AdminAppSdk;
}

class AdminAppRegistry {
  private apps = new Map<string, ActiveAdminApp>();
  private listeners = new Set<() => void>();
  private revision = 0;

  replace(apps: readonly ActiveAdminApp[]): void {
    this.apps = new Map(apps.map((app) => [app.descriptor.appCode, app]));
    this.revision += 1;
    this.emit();
  }

  get(appCode: string): ActiveAdminApp | undefined {
    return this.apps.get(appCode);
  }

  getAll(): ActiveAdminApp[] {
    return [...this.apps.values()];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot = (): number => this.revision;

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const adminAppRegistry = new AdminAppRegistry();
