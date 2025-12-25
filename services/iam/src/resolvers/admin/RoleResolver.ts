import { IAMType } from "./IAMType.js";
import type { PermissionEffect } from "./interfaces/PermissionEffect.js";
import type { Role } from "../../repositories/models/authorization.js";

export interface RoleInput {
  organizationId: string;
  domain: string;
  name: string;
}

interface RolePermission {
  resource: string;
  action: string;
  effect: PermissionEffect;
}

interface RoleData extends Role {
  permissions: RolePermission[];
}

/**
 * Role resolver - resolves role with permissions
 * Loads role from database and policies from casbin
 */
export class RoleResolver extends IAMType<RoleInput, RoleData> {
  async loadData(): Promise<RoleData> {
    const { organizationId, domain, name } = this.value;

    // Load role from database and policies from casbin in parallel
    const [roleData, policies] = await Promise.all([
      this.ctx.loaders.role.load({ organizationId, domain, name }),
      this.ctx.loaders.rolePolicies.load({ organizationId, domain, name }),
    ]);

    if (!roleData) {
      throw new Error(
        `Role not found: org=${organizationId}, domain=${domain}, name=${name}`
      );
    }

    // Map policies to permissions: [sub, obj, act, eft]
    const permissions: RolePermission[] = policies.map(
      ([, resource, action, effect]) => ({
        resource,
        action,
        effect: effect.toUpperCase() as PermissionEffect,
      })
    );

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
    return (await this.data).createdAt.toISOString();
  }

  async updatedAt() {
    return (await this.data).updatedAt.toISOString();
  }
}
