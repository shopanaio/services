export class AppRuntimeDisposedError extends Error {
  constructor(owner: string) {
    super(`Admin App runtime scope "${owner}" has been disposed`);
    this.name = "AppRuntimeDisposedError";
  }
}

export class AppRuntimeScope {
  private active = true;

  constructor(readonly owner: string) {}

  assertActive(): void {
    if (!this.active) {
      throw new AppRuntimeDisposedError(this.owner);
    }
  }

  dispose(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }
}
