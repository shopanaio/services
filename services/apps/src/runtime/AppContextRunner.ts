import { AsyncLocalStorage } from "node:async_hooks";
import type {
  AppExecutionContext,
  AppExecutionContextAccessor,
} from "@shopana/app-sdk";

export class AppContextRunner implements AppExecutionContextAccessor {
  private readonly storage = new AsyncLocalStorage<
    Readonly<AppExecutionContext>
  >();

  run<TResult>(
    context: Readonly<AppExecutionContext>,
    callback: () => TResult,
  ): TResult {
    return this.storage.run(Object.freeze(context), callback);
  }

  current(): Readonly<AppExecutionContext> {
    const context = this.storage.getStore();
    if (!context) {
      throw new Error("App execution context is not available");
    }
    return context;
  }
}
