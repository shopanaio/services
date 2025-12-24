import type { ServiceContext } from "../../../context/index.js";
import type { Kernel } from "../../../kernel/Kernel.js";

export class KernelNotInitializedError extends Error {
  constructor() {
    super("Kernel not initialized");
    this.name = "KernelNotInitializedError";
  }
}

export class StoreNotInContextError extends Error {
  constructor() {
    super("Store not found in request context. Ensure x-store-name header is set.");
    this.name = "StoreNotInContextError";
  }
}

export function requireKernel(ctx: ServiceContext): Kernel {
  if (!ctx.kernel) {
    throw new KernelNotInitializedError();
  }
  return ctx.kernel;
}

export function requireContext(ctx: ServiceContext): ServiceContext {
  if (!ctx.store) {
    throw new StoreNotInContextError();
  }
  return ctx;
}
