import { IAMType, Cache } from "./IAMType.js";
import type { GroupedPermission } from "../../casbin/CasbinService.js";
import type { Role } from "../../repositories/models/authorization.js";

export interface RoleInput {
  organizationId: string;
  domain: string;
  name: string;
}

interface RoleData extends Role {
  permissions: GroupedPermission[];
}

/**
 * Role resolver - resolves role with permissions
 * Loads role from database and policies from casbin
 */
export class RoleResolver extends IAMType<RoleInput, RoleData> {
  @Cache({
    cacheName: "iam:role",
    key: ({ value }: RoleResolver) =>
      `${value.organizationId}:${value.domain}:${value.name}`,
  })
  async loadData(): Promise<RoleData> {
    const { organizationId, domain, name } = this.value;

    // Load role from database and permissions from casbin in parallel
    const [roleData, permissions] = await Promise.all([
      this.ctx.loaders.role.load({ organizationId, domain, name }),
      this.ctx.loaders.rolePermissions.load({ organizationId, domain, name }),
    ]);

    if (!roleData) {
      throw new Error(
        `Role not found: org=${organizationId}, domain=${domain}, name=${name}`
      );
    }

    return {
      ...roleData,
      permissions,
    };
  }

  async id() {
    return (await this.data).id;
  }

  domain() {
    return this.value.domain;
  }

  name() {
    return this.value.name;
  }

  async displayName() {
    return (await this.data).displayName ?? this.value.name;
  }

  async description() {
    return (await this.data).description;
  }

  async isSystem() {
    return (await this.data).isSystem;
  }

  async permissions() {
    return (await this.data).permissions;
  }

  async createdAt() {
    return (await this.data).createdAt;
  }

  async updatedAt() {
    return (await this.data).updatedAt;
  }
}
