import DataLoader from "dataloader";
import type {
  ApplicationUser,
} from "../repositories/models/application-auth.js";
import type {
  ApplicationUserSecurityView,
} from "../repositories/application-user/ApplicationUserRepository.js";
import type { Repository } from "../repositories/Repository.js";

export interface ApplicationUserKey {
  organizationId: string;
  applicationId: string;
  userId: string;
}

export class ApplicationUserLoader {
  public readonly applicationUser: DataLoader<
    ApplicationUserKey,
    ApplicationUser | null,
    string
  >;
  public readonly applicationUserSecurity: DataLoader<
    ApplicationUserKey,
    ApplicationUserSecurityView,
    string
  >;

  constructor(repository: Repository) {
    this.applicationUser = new DataLoader(
      async (keys) => {
        const validKeys = await filterOwnedApplicationKeys(repository, keys);
        const recordsByKey = new Map<string, ApplicationUser>();
        for (const group of groupByApplication(validKeys)) {
          const users = await repository.applicationUser
            .forApplication(group.applicationId)
            .getByIds(group.keys.map(({ userId }) => userId));
          for (const user of users) {
            recordsByKey.set(
              `${group.applicationId}:${user.id}`,
              user
            );
          }
        }
        return keys.map(
          (key) =>
            recordsByKey.get(`${key.applicationId}:${key.userId}`) ?? null
        );
      },
      { cacheKeyFn: applicationUserKeyToString }
    );

    this.applicationUserSecurity = new DataLoader(
      async (keys) => {
        const validKeys = await filterOwnedApplicationKeys(repository, keys);
        const recordsByKey = new Map<string, ApplicationUserSecurityView>();
        for (const group of groupByApplication(validKeys)) {
          const views = await repository.applicationUser
            .forApplication(group.applicationId)
            .getSecurityViews(group.keys.map(({ userId }) => userId));
          for (const view of views) {
            recordsByKey.set(
              `${group.applicationId}:${view.userId}`,
              view
            );
          }
        }
        return keys.map(
          (key) =>
            recordsByKey.get(`${key.applicationId}:${key.userId}`) ?? {
              userId: key.userId,
              activeSessionCount: 0,
              linkedAccountCount: 0,
              hasPasswordLogin: false,
              linkedAccounts: Object.freeze([]),
            }
        );
      },
      { cacheKeyFn: applicationUserKeyToString }
    );
  }
}

async function filterOwnedApplicationKeys(
  repository: Repository,
  keys: readonly ApplicationUserKey[]
): Promise<ApplicationUserKey[]> {
  const applications = await repository.application.getByKeys(
    keys.map(({ applicationId, organizationId }) => ({
      id: applicationId,
      organizationId,
    }))
  );
  const owned = new Set(
    applications.map(
      ({ id, organizationId }) => `${organizationId}:${id}`
    )
  );
  return keys.filter((key) =>
    owned.has(`${key.organizationId}:${key.applicationId}`)
  );
}

function groupByApplication(keys: readonly ApplicationUserKey[]): Array<{
  applicationId: string;
  keys: ApplicationUserKey[];
}> {
  const groups = new Map<string, ApplicationUserKey[]>();
  for (const key of keys) {
    const group = groups.get(key.applicationId);
    if (group) group.push(key);
    else groups.set(key.applicationId, [key]);
  }
  return [...groups].map(([applicationId, groupKeys]) => ({
    applicationId,
    keys: groupKeys,
  }));
}

function applicationUserKeyToString(key: ApplicationUserKey): string {
  return `${key.organizationId}:${key.applicationId}:${key.userId}`;
}
