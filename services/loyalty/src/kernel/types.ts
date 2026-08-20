import type { BaseKernelServices, WorkflowRegistry } from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { Repository } from "../repositories/Repository.js";

export interface LoyaltyKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly workflow: WorkflowRegistry;
  readonly cache: Cache;
}
