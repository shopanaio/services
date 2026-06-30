import { ProductBulkEditWorkflow } from "./ProductBulkEditWorkflow.js";
import { ProductUpdateWorkflow } from "./ProductUpdateWorkflow.js";
import { CategoryUpdateWorkflow } from "./CategoryUpdateWorkflow.js";

export { CategoryUpdateWorkflow, ProductBulkEditWorkflow, ProductUpdateWorkflow };

export const workflows = [
  CategoryUpdateWorkflow,
  ProductBulkEditWorkflow,
  ProductUpdateWorkflow,
];
