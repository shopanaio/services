import type { CustomerData } from "../../repositories/customer/CustomerRepository.js";
import { UsersType } from "./UsersType.js";

/**
 * Customer resolver - resolves storefront customer domain interface
 */
export class CustomerResolver extends UsersType<string, CustomerData | null> {
  async loadData() {
    return this.ctx.loaders.customer.load(this.value);
  }

  id() {
    return this.value;
  }

  async email() {
    return this.get("email");
  }

  async emailVerified() {
    return this.get("emailVerified");
  }

  async firstName() {
    return this.get("firstName");
  }

  async lastName() {
    return this.get("lastName");
  }

  async avatar() {
    return this.get("avatar");
  }

  async phone() {
    return this.get("phone");
  }

  async locale() {
    return this.get("locale");
  }

  async isForbidden() {
    return this.get("isForbidden");
  }

  async isDeleted() {
    return this.get("isDeleted");
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }
}
