import { DiscountCreateWorkflow } from "./DiscountCreateWorkflow.js";
import { DiscountUpdateWorkflow } from "./DiscountUpdateWorkflow.js";

export const workflows = [DiscountCreateWorkflow, DiscountUpdateWorkflow];

export * from "./DiscountCreateWorkflow.js";
export * from "./DiscountUpdateWorkflow.js";
export * from "./dto/index.js";
