import DataLoader from "dataloader";
import type { CasbinService } from "../casbin/CasbinService.js";

export interface RolePoliciesKey {
  organizationId: string;
  role: string;
}

function keyToString(key: RolePoliciesKey): string {
  return `${key.organizationId}:${key.role}`;
}

/**
 * RoleLoader - batch loads policies for specific roles
 */
export class RoleLoader {
  /**
   * Load policies for a specific role in organization
   * Returns array of policy tuples: [role, domain, resource, action, effect]
   */
  public readonly rolePolicies: DataLoader<RolePoliciesKey, string[][], string>;

  constructor(casbin: CasbinService) {
    this.rolePolicies = new DataLoader<RolePoliciesKey, string[][], string>(
      async (keys) => {
        // Load policies for each role
        const results = await Promise.all(
          keys.map((key) =>
            casbin.getPoliciesForRole(key.organizationId, key.role)
          )
        );
        return results;
      },
      {
        cacheKeyFn: keyToString,
      }
    );
  }
}
