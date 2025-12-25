import { IAMType } from "./IAMType.js";
import { RolePermissionResolver } from "./RolePermissionResolver.js";
import type { PermissionEffect } from "./interfaces/PermissionEffect.js";

export interface RoleInput {
  organizationId: string;
  domain: string;
  name: string;
}

interface RoleData {
  id: string;
  organizationId: string;
  domain: string;
  name: string;
  displayName: string | null;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  permissions: Array<{
    resource: string;
    actions: string[];
    effect: PermissionEffect;
  }>;
}

/**
 * Role resolver - resolves role with permissions
 */
export class RoleResolver extends IAMType<RoleInput, RoleData | null> {
  async loadData(): Promise<RoleData | null> {
    const { organizationId, domain, name } = this.value;

    // Get policies for this role from casbin
    const policies = await this.ctx.kernel.repository.casbin.getPolicies(
      organizationId
    );

    // Filter policies for this role and domain
    const rolePermissions: Array<{
      resource: string;
      actions: string[];
      effect: PermissionEffect;
    }> = [];

    // Group policies by resource and effect
    const resourceMap = new Map<
      string,
      { actions: Set<string>; effect: PermissionEffect }
    >();

    for (const policy of policies) {
      // Policy format: [role, domain, resource, action, effect]
      const [pRole, pDomain, pResource, pAction, pEffect] = policy;

      if (pRole === name && (pDomain === domain || pDomain === "*")) {
        const key = `${pResource}:${pEffect}`;
        if (!resourceMap.has(key)) {
          resourceMap.set(key, {
            actions: new Set(),
            effect: (pEffect?.toUpperCase() === "DENY" ? "DENY" : "ALLOW") as PermissionEffect,
          });
        }
        resourceMap.get(key)!.actions.add(pAction);
      }
    }

    // Convert map to array
    for (const [key, value] of resourceMap) {
      const resource = key.split(":")[0];
      rolePermissions.push({
        resource,
        actions: Array.from(value.actions),
        effect: value.effect,
      });
    }

    return {
      id: `${organizationId}:${domain}:${name}`,
      organizationId,
      domain,
      name,
      displayName: this.getDisplayName(name),
      description: null,
      isSystem: this.isSystemRole(name),
      createdAt: new Date(),
      permissions: rolePermissions,
    };
  }

  private getDisplayName(name: string): string {
    // Convert role name to display name
    const names: Record<string, string> = {
      owner: "Owner",
      admin: "Administrator",
      manager: "Manager",
      editor: "Editor",
      viewer: "Viewer",
    };
    return names[name] || name.charAt(0).toUpperCase() + name.slice(1);
  }

  private isSystemRole(name: string): boolean {
    const systemRoles = ["owner", "admin", "manager", "editor", "viewer"];
    return systemRoles.includes(name);
  }

  id() {
    return `${this.value.organizationId}:${this.value.domain}:${this.value.name}`;
  }

  async domain() {
    return this.value.domain;
  }

  async name() {
    return this.value.name;
  }

  async displayName() {
    const data = await this.data;
    return data?.displayName ?? this.value.name;
  }

  async description() {
    const data = await this.data;
    return data?.description ?? null;
  }

  async isSystem() {
    const data = await this.data;
    return data?.isSystem ?? false;
  }

  async permissions(): Promise<RolePermissionResolver[]> {
    const data = await this.data;
    if (!data) return [];

    return data.permissions.map(
      (p: RoleData["permissions"][number]) => new RolePermissionResolver(p, this.ctx)
    );
  }

  async createdAt() {
    const data = await this.data;
    return data?.createdAt?.toISOString() ?? null;
  }
}
