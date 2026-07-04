import { ProductBulkEditWorkflow } from "./ProductBulkEditWorkflow.js";
import { ProductUpdateWorkflow } from "./ProductUpdateWorkflow.js";
import { CategoryUpdateWorkflow } from "./CategoryUpdateWorkflow.js";
import { FacetReferenceSyncWorkflow } from "./FacetReferenceSyncWorkflow.js";

export {
  CategoryUpdateWorkflow,
  FacetReferenceSyncWorkflow,
  ProductBulkEditWorkflow,
  ProductUpdateWorkflow,
};

export const workflows = [
  CategoryUpdateWorkflow,
  FacetReferenceSyncWorkflow,
  ProductBulkEditWorkflow,
  ProductUpdateWorkflow,
];
