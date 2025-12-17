import type { User } from "@shopana/casdoor-node-sdk";
import { UsersType } from "./UsersType.js";

/**
 * Customer resolver - resolves storefront customer domain interface
 * Uses User type from @shopana/casdoor-node-sdk
 */
export class CustomerResolver extends UsersType<string, User | null> {
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
    return this.get("language");
  }

  async isForbidden() {
    return this.get("isForbidden");
  }

  async isDeleted() {
    return this.get("isDeleted");
  }

  async createdAt() {
    return this.get("createdTime");
  }

  async updatedAt() {
    return this.get("updatedTime");
  }
}
