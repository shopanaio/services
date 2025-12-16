import type { User } from "../../repositories/models/index.js";
import { UsersType } from "./UsersType.js";

/**
 * User view - resolves User domain interface
 * Accepts user ID, loads data lazily via loaders
 */
export class UserResolver extends UsersType<string, User | null> {
  static fields = {};

  async loadData() {
    return this.ctx.loaders.user.load(this.value);
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
