import DataLoader from "dataloader";
import type { CasbinService } from "../casbin/CasbinService.js";
import type { Repository } from "../repositories/Repository.js";
import type { Role } from "../repositories/models/authorization.js";

export interface RoleKey {
  organizationId: string;
  domain: string;
  name: string;
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
   * Load policies for a specific role
   * Returns array of policy tuples: [sub, obj, act, eft]
   */
  public readonly rolePolicies: DataLoader<RoleKey, string[][], string>;

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

    this.rolePolicies = new DataLoader<RoleKey, string[][], string>(
      async (keys) => {
        const results = await Promise.all(
          keys.map((key) =>
            casbin.getPoliciesForRole(key.organizationId, key.name)
          )
        );
        return results;
      },
      {
        cacheKeyFn: roleKeyToString,
      }
    );
  }
}
