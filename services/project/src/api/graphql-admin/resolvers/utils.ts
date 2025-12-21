import type { ServiceContext } from "../../../context/index.js";
import type { Kernel } from "../../../kernel/Kernel.js";

export class KernelNotInitializedError extends Error {
  constructor() {
    super("Kernel not initialized");
    this.name = "KernelNotInitializedError";
  }
}

export class ProjectNotInContextError extends Error {
  constructor() {
    super("Project not found in request context. Ensure x-project-name header is set.");
    this.name = "ProjectNotInContextError";
  }
}

export function requireKernel(ctx: ServiceContext): Kernel {
  if (!ctx.kernel) {
    throw new KernelNotInitializedError();
  }
  return ctx.kernel;
}

export function requireContext(ctx: ServiceContext): ServiceContext {
  if (!ctx.project) {
    throw new ProjectNotInContextError();
  }
  return ctx;
}
