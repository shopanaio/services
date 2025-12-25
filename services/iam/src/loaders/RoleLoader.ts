import DataLoader from "dataloader";
import type {
  CasbinService,
  GroupedPermission,
} from "../casbin/CasbinService.js";
import type { Repository } from "../repositories/Repository.js";
import type { Role } from "../repositories/models/authorization.js";

export interface RoleKey {
  organizationId: string;
  domain: string;
  name: string;
}

export interface DomainKey {
  organizationId: string;
  domain: string;
}

function domainKeyToString(key: DomainKey): string {
  return `${key.organizationId}:${key.domain}`;
}

function roleKeyToString(key: RoleKey): string {
  return `${key.organizationId}:${key.domain}:${key.name}`;
}

/**
 * RoleLoader - batch loads roles and their policies
 */
export class RoleLoader {
  /**
   * Load role from database by organizationId, domain, name
   */
  public readonly role: DataLoader<RoleKey, Role | null, string>;

  /**
   * Load grouped permissions for a specific role
   * Returns permissions aggregated by (resource, effect) with actions array
   */
  public readonly rolePermissions: DataLoader<RoleKey, GroupedPermission[], string>;

  /**
   * Load all roles for a domain
   */
  public readonly rolesByDomain: DataLoader<DomainKey, Role[], string>;

  constructor(repository: Repository, casbin: CasbinService) {
    this.role = new DataLoader<RoleKey, Role | null, string>(
      async (keys) => {
        const results = await Promise.all(
          keys.map((key) =>
            repository.organization.findRole(
              key.organizationId,
              key.domain,
              key.name
            )
          )
        );
        return results;
      },
      {
        cacheKeyFn: roleKeyToString,
      }
    );

    this.rolePermissions = new DataLoader<RoleKey, GroupedPermission[], string>(
      async (keys) => {
        const results = await Promise.all(
          keys.map((key) =>
            casbin.getGroupedPoliciesForRole(key.organizationId, key.name)
          )
        );
        return results;
      },
      {
        cacheKeyFn: roleKeyToString,
      }
    );

    this.rolesByDomain = new DataLoader<DomainKey, Role[], string>(
      async (keys) => {
        const results = await Promise.all(
          keys.map((key) =>
            repository.organization.getRolesByDomain(
              key.organizationId,
              key.domain
            )
          )
        );
        return results;
      },
      {
        cacheKeyFn: domainKeyToString,
      }
    );
  }
}
