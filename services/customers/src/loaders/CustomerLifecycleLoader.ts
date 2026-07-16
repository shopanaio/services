import DataLoader from "dataloader";
import type {
  CustomerDataRequest,
  CustomerMerge,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export class CustomerLifecycleLoader {
  readonly customerMerge: DataLoader<string, CustomerMerge | null>;
  readonly customerDataRequest: DataLoader<string, CustomerDataRequest | null>;

  constructor(repository: Repository) {
    this.customerMerge = new DataLoader(async (ids) =>
      mapById(ids, await repository.lifecycle.getMergesByIds(ids))
    );
    this.customerDataRequest = new DataLoader(async (ids) =>
      mapById(ids, await repository.lifecycle.getDataRequestsByIds(ids))
    );
  }
}
