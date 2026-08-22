import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { ProductCreateParams } from "./ProductCreateDto.js";

export interface ProductCreateContext extends DurableWorkflowContext {
  readonly organizationId: string;
  readonly storeId: string;
  readonly locale: string;
  readonly requestId: string;
  readonly userId?: string;
}

export interface ProductCreateWorkflowInput {
  readonly params: ProductCreateParams;
  readonly context: ProductCreateContext;
}
