import type { User } from "../../repositories/user/UserRepository.js";
import type { Role } from "./interfaces/index.js";
import { UsersType, Cache } from "./UsersType.js";

/**
 * User resolver - resolves admin user domain interface
 * Uses local User type from UserRepository
 */
export class UserResolver extends UsersType<string, User | null> {
  @Cache({
    cacheName: "user",
    key: (resolver: UserResolver) => resolver.value,
  })
  async loadData() {
    return this.ctx.kernel.repository.user.findById(this.value);
  }

  id() {
    return this.value;
  }

  async email() {
    return this.get("email");
  }

  async emailVerified() {
    return this.get("emailVerified") ?? false;
  }

  async name() {
    return this.get("name");
  }

  async image() {
    return this.get("image");
  }

  async createdAt() {
    const date = await this.get("createdAt");
    return date?.toISOString() ?? null;
  }

  async updatedAt() {
    const date = await this.get("updatedAt");
    return date?.toISOString() ?? null;
  }

  // Note: Role management is pending migration to node-casbin
  async roles(): Promise<Role[]> {
    // Stub - will be implemented with node-casbin migration
    return [];
  }
}
