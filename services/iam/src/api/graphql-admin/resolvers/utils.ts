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

export function requireOrganization(ctx: ServiceContext): string {
  if (!ctx.organizationId) {
    throw new NoOrgContextError();
  }
  return ctx.organizationId;
}

export class NoKernelError extends Error {
  constructor() {
    super("Service not configured");
    this.name = "NoKernelError";
  }
}

export class NoOrgContextError extends Error {
  constructor() {
    super("Organization context required. Use switchOrganization mutation to set org in JWT.");
    this.name = "NoOrgContextError";
  }
}
