import type { DurableWorkflowContext } from "@shopana/shared-kernel";
export interface ProductDeleteContext extends DurableWorkflowContext {
  readonly organizationId: string;
  readonly storeId: string;
  readonly locale: string;
  readonly requestId: string;
  readonly userId?: string;
}

export interface ProductDeleteWorkflowInput {
  readonly productId: string;
  readonly permanent: boolean;
  readonly context: ProductDeleteContext;
}
