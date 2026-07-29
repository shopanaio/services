export type AppRuntimeInvocationErrorCode =
  | "APP_RUNTIME_UNAVAILABLE"
  | "APP_ROUTE_UNAVAILABLE";

export class AppRuntimeInvocationError extends Error {
  constructor(
    readonly code: AppRuntimeInvocationErrorCode,
    cause?: unknown,
  ) {
    super(
      code === "APP_RUNTIME_UNAVAILABLE"
        ? "App runtime is unavailable"
        : "App capability route is unavailable",
      cause === undefined ? undefined : { cause },
    );
    this.name = "AppRuntimeInvocationError";
  }
}
