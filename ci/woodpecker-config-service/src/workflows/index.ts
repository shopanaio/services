import { LintWorkflow } from "./lint";
import { PlaywrightWorkflow } from "./playwright";

export const workflows = [
  new LintWorkflow(),
  new PlaywrightWorkflow(),
];
