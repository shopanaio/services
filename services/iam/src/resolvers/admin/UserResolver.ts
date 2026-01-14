import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { User } from "../../repositories/user/UserRepository.js";
import { IAMType, Cache } from "./IAMType.js";

/**
 * User resolver - resolves admin user domain interface
 * Uses local User type from UserRepository
 */
@SubgraphReference()
export class UserResolver extends IAMType<string, User> {
  async $preload() {
    const user = await this.$ctx.kernel.repository.user.findById(this.$props);
    if (!user) {
      throw new Error(`User not found: ${this.$props}`);
    }
    return user;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.User);
  }

  async email() {
    return this.$get("email");
  }

  async emailVerified() {
    return this.$get("emailVerified") ?? false;
  }

  async firstName() {
    return this.$get("firstName");
  }

  async lastName() {
    return this.$get("lastName");
  }

  async avatar() {
    return this.$get("image");
  }

  async locale() {
    // TODO: Add locale field to user model
    return null;
  }

  async isAdmin() {
    return this.$get("admin") ?? false;
  }

  async isForbidden() {
    // TODO: Add isForbidden field to user model
    return false;
  }

  async isDeleted() {
    // TODO: Add isDeleted field to user model
    return false;
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
