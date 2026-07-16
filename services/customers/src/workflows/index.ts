import { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
import { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
import { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";

export const workflows = [
  CustomerCreateWorkflow,
  CustomerUpdateWorkflow,
  CustomerDeleteWorkflow,
];

export { CustomerCreateWorkflow } from "./CustomerCreateWorkflow.js";
export { CustomerDeleteWorkflow } from "./CustomerDeleteWorkflow.js";
export { CustomerUpdateWorkflow } from "./CustomerUpdateWorkflow.js";
export * from "./dto/index.js";
