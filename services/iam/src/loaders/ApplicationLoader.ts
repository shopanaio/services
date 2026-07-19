import DataLoader from "dataloader";
import type {
  ApplicationAdminRecord,
  ApplicationKey,
} from "../repositories/ApplicationRepository.js";
import type { Repository } from "../repositories/Repository.js";

export class ApplicationLoader {
  public readonly application: DataLoader<
    ApplicationKey,
    ApplicationAdminRecord | null,
    string
  >;

  constructor(repository: Repository) {
    this.application = new DataLoader(
      async (keys) => {
        const records = await repository.application.getByKeys(keys);
        const recordsById = new Map(records.map((record) => [record.id, record]));
        return keys.map((key) => {
          const record = recordsById.get(key.id);
          if (!record) return null;
          if (
            key.organizationId &&
            record.organizationId !== key.organizationId
          ) {
            return null;
          }
          return record;
        });
      },
      { cacheKeyFn: applicationKeyToString }
    );
  }
}

export function applicationKeyToString(key: ApplicationKey): string {
  return `${key.organizationId ?? "*"}:${key.id}`;
}
