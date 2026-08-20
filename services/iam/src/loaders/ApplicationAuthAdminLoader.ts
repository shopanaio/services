import DataLoader from "dataloader";
import type { ApplicationAuthAdminView } from "../repositories/ApplicationAuthAdminQueryRepository.js";
import type { ApplicationKey } from "../repositories/ApplicationRepository.js";
import type { Repository } from "../repositories/Repository.js";
import { applicationKeyToString } from "./ApplicationLoader.js";

export class ApplicationAuthAdminLoader {
  public readonly applicationAuthAdmin: DataLoader<
    ApplicationKey,
    ApplicationAuthAdminView | null,
    string
  >;

  constructor(repository: Repository) {
    this.applicationAuthAdmin = new DataLoader(
      async (keys) => {
        const records = await repository.applicationAuthAdminQuery.getByApplicationKeys(keys);
        const recordsByApplicationId = new Map(
          records.map((record) => [record.applicationId, record]),
        );
        return keys.map((key) => {
          const record = recordsByApplicationId.get(key.id);
          if (!record) return null;
          if (key.organizationId && record.organizationId !== key.organizationId) {
            return null;
          }
          return record;
        });
      },
      { cacheKeyFn: applicationKeyToString },
    );
  }
}
