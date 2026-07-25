import type { AdminAppExtensionDescriptor } from "../descriptor-schema";

export interface RegisteredAdminAppExtension {
  owner: string;
  appCode: string;
  descriptor: AdminAppExtensionDescriptor;
}

class AdminAppExtensionRegistry {
  private extensions: RegisteredAdminAppExtension[] = [];
  private listeners = new Set<() => void>();
  private revision = 0;

  replace(extensions: readonly RegisteredAdminAppExtension[]): void {
    this.extensions = [...extensions].sort(
      (left, right) =>
        left.descriptor.priority - right.descriptor.priority ||
        left.appCode.localeCompare(right.appCode) ||
        left.descriptor.id.localeCompare(right.descriptor.id),
    );
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
  }

  forPoint(point: string): RegisteredAdminAppExtension[] {
    return this.extensions.filter(
      (extension) => extension.descriptor.point === point,
    );
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot = (): number => this.revision;
}

export const adminAppExtensionRegistry = new AdminAppExtensionRegistry();
