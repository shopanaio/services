import type { ServiceContext } from "../../../context/index.js";
import type { Kernel } from "../../../kernel/Kernel.js";

const NO_KERNEL_ERROR = {
  message: "Service not configured",
  code: "NO_KERNEL",
} as const;

export function noKernelError<T extends Record<string, unknown>>(
  nullFields: T
) {
  return { ...nullFields, userErrors: [NO_KERNEL_ERROR] };
}

export function requireKernel(ctx: ServiceContext): Kernel {
  if (!ctx.kernel) {
    throw new NoKernelError();
  }
  return ctx.kernel;
}

export class NoKernelError extends Error {
  constructor() {
    super("Service not configured");
    this.name = "NoKernelError";
  }
}
