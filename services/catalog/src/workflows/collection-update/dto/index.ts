import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { CollectionUpdatedReason } from "@shopana/events";
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
import type { CollectionMutationOperation } from "../scripts/index.js";
interface CollectionOperationMeta {
  readonly fieldPrefix: readonly string[];
  readonly reasons?: readonly CollectionUpdatedReason[];
}
export type CollectionUpdateOperation =
  | Readonly<{
      type: "collectionFieldsUpdate";
      params: Extract<CollectionMutationOperation, { kind: "update" }>["params"];
      meta: CollectionOperationMeta;
    }>
  | Readonly<{
      type: "collectionProductAdd";
      params: Extract<CollectionMutationOperation, { kind: "addProducts" }>["params"];
      meta: CollectionOperationMeta;
    }>
  | Readonly<{
      type: "collectionProductRemove";
      params: Extract<CollectionMutationOperation, { kind: "removeProducts" }>["params"];
      meta: CollectionOperationMeta;
    }>
  | Readonly<{
      type: "collectionProductMove";
      params: Extract<CollectionMutationOperation, { kind: "moveProduct" }>["params"];
      meta: CollectionOperationMeta;
    }>
  | Readonly<{
      type: "collectionProductClear";
      params: Extract<CollectionMutationOperation, { kind: "clearProducts" }>["params"];
      meta: CollectionOperationMeta;
    }>
  | Readonly<{
      type: "collectionProductRebalance";
      params: Extract<CollectionMutationOperation, { kind: "rebalance" }>["params"];
      meta: CollectionOperationMeta;
    }>
  | Readonly<{
      type: "collectionRulesReplace";
      params: Extract<CollectionMutationOperation, { kind: "updateRules" }>["params"];
      meta: CollectionOperationMeta;
    }>;
export interface CollectionUpdateWorkflowInput {
  readonly collectionId: string;
  readonly operations: readonly CollectionUpdateOperation[];
  readonly context: CollectionWorkflowContext;
}
export interface CollectionOperationResult {
  readonly type: CollectionUpdateOperation["type"];
  readonly applied: boolean;
  readonly entityId?: string;
  readonly errors: readonly UserError[];
}
export interface CollectionUpdateWorkflowResult {
  readonly collection: { readonly id: string } | null;
  readonly operationResults: readonly CollectionOperationResult[];
  readonly userErrors: readonly UserError[];
}
