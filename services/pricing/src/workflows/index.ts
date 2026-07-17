import { DiscountCreateWorkflow } from "./DiscountCreateWorkflow.js";
import { DiscountDeleteWorkflow } from "./DiscountDeleteWorkflow.js";
import {
  DiscountExternalReferenceCreateWorkflow,
  DiscountExternalReferenceDeleteWorkflow,
  DiscountExternalReferenceUpdateWorkflow,
} from "./DiscountExternalReferenceWorkflows.js";
import { DiscountUpdateWorkflow } from "./DiscountUpdateWorkflow.js";

export const workflows = [
  DiscountCreateWorkflow,
  DiscountDeleteWorkflow,
  DiscountExternalReferenceCreateWorkflow,
  DiscountExternalReferenceUpdateWorkflow,
  DiscountExternalReferenceDeleteWorkflow,
  DiscountUpdateWorkflow,
];

export * from "./DiscountCreateWorkflow.js";
export * from "./DiscountDeleteWorkflow.js";
export * from "./DiscountExternalReferenceWorkflows.js";
export * from "./DiscountUpdateWorkflow.js";
export * from "./dto/index.js";
