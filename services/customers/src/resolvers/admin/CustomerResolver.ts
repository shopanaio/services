import type { Customer } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

/**
 * Customer view - resolves Customer domain interface
 * Accepts customer ID, loads data lazily via loaders
 */
export class CustomerResolver extends CustomersType<string, Customer | null> {
  static fields = {};

  async loadData() {
    return this.ctx.loaders.customer.load(this.value);
  }

  id() {
    return this.value;
  }

  async email() {
    return this.get("email");
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }

  async deletedAt() {
    return this.get("deletedAt");
  }
}
