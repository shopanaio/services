import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
  WorkflowRegistry,
} from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository.js";

export interface AuditKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly workflow: WorkflowRegistry;
}

export type ScriptContext = BaseScriptContext;
export type TransactionScript<TParams = unknown, TResult = unknown> = BaseTransactionScript<
  TParams,
  TResult,
  AuditKernelServices
>;
