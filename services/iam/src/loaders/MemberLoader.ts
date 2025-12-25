import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import type { UserRole } from "../repositories/models/authorization.js";

/**
 * Key for loading member data
 * Uses composite key: organizationId:userId:domain
 */
export interface MemberKey {
  organizationId: string;
  userId: string;
  domain: string;
}

function keyToString(key: MemberKey): string {
  return `${key.organizationId}:${key.userId}:${key.domain}`;
}

/**
 * MemberLoader - batch loads user role data
 */
export class MemberLoader {
  public readonly member: DataLoader<MemberKey, UserRole | null, string>;

  constructor(repository: Repository) {
    this.member = new DataLoader<MemberKey, UserRole | null, string>(
      async (keys) => {
        // Group keys by organizationId + domain for efficient querying
        const groupedByDomain = new Map<string, MemberKey[]>();

        for (const key of keys) {
          const domainKey = `${key.organizationId}:${key.domain}`;
          if (!groupedByDomain.has(domainKey)) {
            groupedByDomain.set(domainKey, []);
          }
          groupedByDomain.get(domainKey)!.push(key);
        }

        // Load all user roles for each domain group
        const results = new Map<string, UserRole>();

        for (const [, domainKeys] of groupedByDomain) {
          const { organizationId, domain } = domainKeys[0];
          const userRoles =
            await repository.organization.getUserRolesByDomain(
              organizationId,
              domain
            );

          for (const ur of userRoles) {
            const key = keyToString({
              organizationId: ur.organizationId,
              userId: ur.userId,
              domain: ur.domain,
            });
            results.set(key, ur);
          }
        }

        // Return results in same order as input keys
        return keys.map((key) => results.get(keyToString(key)) ?? null);
      },
      {
        cacheKeyFn: (key: MemberKey) => keyToString(key),
      }
    );
  }
}
