import type { Customer } from "../../../repositories/models/index.js";
import type { CustomerResultBase } from "./shared.js";

export interface CustomerUpdateParams {
  readonly id: string;
  readonly email?: string;
}

export interface CustomerUpdateResult extends CustomerResultBase {
  customer?: Customer;
}
