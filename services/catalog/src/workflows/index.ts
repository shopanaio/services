import { ProductBulkEditWorkflow } from "./ProductBulkEditWorkflow.js";
import { ProductUpdateWorkflow } from "./ProductUpdateWorkflow.js";
import { CategoryUpdateWorkflow } from "./CategoryUpdateWorkflow.js";
import {
  CollectionMutationWorkflow,
  CollectionProductSyncWorkflow,
  CollectionRulesPreviewWorkflow,
} from "./CollectionMutationWorkflows.js";

export {
  CategoryUpdateWorkflow,
  ProductBulkEditWorkflow,
  ProductUpdateWorkflow,
  CollectionMutationWorkflow,
  CollectionProductSyncWorkflow,
  CollectionRulesPreviewWorkflow,
};

export const workflows = [
  CategoryUpdateWorkflow,
  ProductBulkEditWorkflow,
  ProductUpdateWorkflow,
  CollectionMutationWorkflow,
  CollectionProductSyncWorkflow,
  CollectionRulesPreviewWorkflow,
];
