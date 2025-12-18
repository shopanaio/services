import type { User } from "casdoor-nodejs-sdk/lib/cjs/user";
import type { Role as CasdoorRole } from "casdoor-nodejs-sdk/lib/cjs/role";
import type { Role } from "./interfaces/index.js";
import { UsersType } from "./UsersType.js";

/**
 * User resolver - resolves admin user domain interface
 * Uses User type from casdoor-nodejs-sdk
 */
export class UserResolver extends UsersType<string, User | null> {
  async loadData() {
    return this.ctx.loaders.user.load(this.value);
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

  async isAdmin() {
    return this.get("isAdmin");
  }

  async isForbidden() {
    return this.get("isForbidden");
  }

  async isDeleted() {
    return this.get("isDeleted");
  }

  async roles(): Promise<Role[]> {
    const casdoorRoles = await this.get("roles");
    return this.mapRoles(casdoorRoles);
  }

  async createdAt() {
    return this.get("createdTime");
  }

  async updatedAt() {
    return this.get("updatedTime");
  }

  private mapRoles(roles?: CasdoorRole[]): Role[] {
    if (!roles) return [];
    return roles.map((r) => ({
      owner: r.owner,
      name: r.name,
      displayName: r.displayName || null,
      description: r.description || null,
      isEnabled: r.isEnabled ?? true,
    }));
  }
}
