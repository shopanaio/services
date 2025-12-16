import type { CustomerResultBase } from "./shared.js";

export interface CustomerDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface CustomerDeleteResult extends CustomerResultBase {
  deletedCustomerId?: string;
}
