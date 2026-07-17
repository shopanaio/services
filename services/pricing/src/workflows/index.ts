import { DiscountCreateWorkflow } from "./DiscountCreateWorkflow.js";
import { DiscountDeleteWorkflow } from "./DiscountDeleteWorkflow.js";
import { DiscountUpdateWorkflow } from "./DiscountUpdateWorkflow.js";

export const workflows = [
  DiscountCreateWorkflow,
  DiscountDeleteWorkflow,
  DiscountUpdateWorkflow,
];

export * from "./DiscountCreateWorkflow.js";
export * from "./DiscountDeleteWorkflow.js";
export * from "./DiscountUpdateWorkflow.js";
export * from "./dto/index.js";
