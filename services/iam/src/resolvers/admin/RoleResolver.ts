import { IAMType } from "./IAMType.js";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
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
  async $preload(): Promise<RoleData> {
    const { organizationId, domain, name } = this.$props;

    // Load role from database and permissions from casbin in parallel
    const [roleData, permissions] = await Promise.all([
      this.$ctx.loaders.role.load({ organizationId, domain, name }),
      this.$ctx.loaders.rolePermissions.load({ organizationId, domain, name }),
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
    const id = (await this.$data).id;
    return encodeGlobalIdByType(id, GlobalIdEntity.Role);
  }

  domain() {
    return this.$props.domain;
  }

  name() {
    return this.$props.name;
  }

  async displayName() {
    return (await this.$data).displayName ?? this.$props.name;
  }

  async description() {
    return (await this.$data).description;
  }

  async isSystem() {
    return (await this.$data).isSystem;
  }

  async permissions() {
    return (await this.$data).permissions;
  }

  async createdAt() {
    return (await this.$data).createdAt;
  }

  async updatedAt() {
    return (await this.$data).updatedAt;
  }
}
