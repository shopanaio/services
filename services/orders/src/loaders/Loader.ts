import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

export class Loader {
  readonly order: DataLoader<string, Record<string, unknown> | null>;
  readonly operation: DataLoader<string, Record<string, unknown> | null>;
  readonly editSession: DataLoader<string, Record<string, unknown> | null>;

  constructor(repository: Repository, storeId: string) {
    this.order = new DataLoader(async (ids) => {
      const rows = await repository.adminRead.findDetails(storeId, ids);
      const byId = new Map(rows.map((row) => [String(row.id), row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.operation = new DataLoader(async (ids) => {
      const rows = await repository.adminRead.operations(storeId, ids);
      const byId = new Map(rows.map((row) => [String(row.id), row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.editSession = new DataLoader(async (ids) => {
      const rows = await repository.adminRead.editSessions(storeId, ids);
      const byId = new Map(rows.map((row) => [String(row.id), row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
  }
}
