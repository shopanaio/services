import type { Customer } from "../../../repositories/models/index.js";
import type { CustomerResultBase } from "./shared.js";

export interface CustomerCreateParams {
  readonly email: string;
}

export interface CustomerCreateResult extends CustomerResultBase {
  customer?: Customer;
}
