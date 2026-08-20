export type AppRuntimeInvocationErrorCode =
  "APP_ACTION_NOT_READ_ONLY" | "APP_RUNTIME_UNAVAILABLE" | "APP_ROUTE_UNAVAILABLE";

export class AppRuntimeInvocationError extends Error {
  constructor(
    readonly code: AppRuntimeInvocationErrorCode,
    cause?: unknown,
  ) {
    super(
      code === "APP_RUNTIME_UNAVAILABLE"
        ? "App runtime is unavailable"
        : code === "APP_ACTION_NOT_READ_ONLY"
          ? "App action is not classified as read-only"
          : "App capability route is unavailable",
      cause === undefined ? undefined : { cause },
    );
    this.name = "AppRuntimeInvocationError";
  }
}
