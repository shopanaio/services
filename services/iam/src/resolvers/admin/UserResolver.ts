import type { User } from "../../repositories/user/UserRepository.js";
import { IAMType, Cache } from "./IAMType.js";

/**
 * User resolver - resolves admin user domain interface
 * Uses local User type from UserRepository
 */
export class UserResolver extends IAMType<string, User | null> {
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
}
