import { ProductBulkEditWorkflow } from "./ProductBulkEditWorkflow.js";
import { ProductUpdateWorkflow } from "./ProductUpdateWorkflow.js";
import {
  CategoryCreateWorkflow,
  CategoryDeleteWorkflow,
  CategoryUpdateWorkflow,
} from "./CategoryUpdateWorkflow.js";
import {
  CollectionMutationWorkflow,
  CollectionProductSyncWorkflow,
  CollectionRulesPreviewWorkflow,
} from "./CollectionMutationWorkflows.js";

export {
  CategoryCreateWorkflow,
  CategoryDeleteWorkflow,
  CategoryUpdateWorkflow,
  ProductBulkEditWorkflow,
  ProductUpdateWorkflow,
  CollectionMutationWorkflow,
  CollectionProductSyncWorkflow,
  CollectionRulesPreviewWorkflow,
};

export const workflows = [
  CategoryCreateWorkflow,
  CategoryDeleteWorkflow,
  CategoryUpdateWorkflow,
  ProductBulkEditWorkflow,
  ProductUpdateWorkflow,
  CollectionMutationWorkflow,
  CollectionProductSyncWorkflow,
  CollectionRulesPreviewWorkflow,
];
