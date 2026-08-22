import type { DurableWorkflowContext } from "@shopana/shared-kernel";
export interface CollectionWorkflowContext extends DurableWorkflowContext {
  readonly storeId: string;
  readonly organizationId: string;
  readonly requestId: string;
  readonly userId?: string;
  readonly locale: string;
  readonly currency: string;
  readonly defaultLocale: string;
  readonly defaultCurrency: string;
  readonly locales: readonly string[];
  readonly currencies: readonly string[];
}
import type { UserError } from "../../../kernel/BaseScript.js";
import type { CollectionCreateParams } from "./CollectionScriptDto.js";
export interface CollectionCreateWorkflowInput {
  readonly params: CollectionCreateParams;
  readonly context: CollectionWorkflowContext;
}
export interface CollectionCreateWorkflowResult {
  readonly collection: { readonly id: string } | null;
  readonly userErrors: readonly UserError[];
}
