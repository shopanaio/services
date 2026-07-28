import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
  WorkflowRegistry,
} from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { NotificationTemplateRenderer } from "../infrastructure/templates/NotificationTemplateRenderer.js";
import type { TemplateDefinitionRegistry } from "../infrastructure/templates/TemplateDefinitionRegistry.js";
import type { Repository } from "../repositories/Repository.js";

export interface NotificationKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly cache: Cache;
  readonly workflow: WorkflowRegistry;
  readonly definitions: TemplateDefinitionRegistry;
  readonly renderer: NotificationTemplateRenderer;
}

export type ScriptContext = BaseScriptContext;
export type TransactionScript<TParams = unknown, TResult = unknown> =
  BaseTransactionScript<TParams, TResult, NotificationKernelServices>;

export interface RunScriptContext {
  storeId: string;
  organizationId: string;
  locale?: string;
  defaultLocale?: string;
  userId?: string;
  requestId?: string;
  displayName?: string;
  timezone?: string;
  email?: string | null;
}
