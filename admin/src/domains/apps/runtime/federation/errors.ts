export class AdminAppRemoteLoadError extends Error {
  constructor(
    readonly appCode: string,
    readonly module: string,
    cause?: unknown,
  ) {
    super(`Unable to load Admin App module "${appCode}:${module}"`, { cause });
    this.name = "AdminAppRemoteLoadError";
  }
}

