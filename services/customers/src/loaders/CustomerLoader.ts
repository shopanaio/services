import DataLoader from "dataloader";
import type { Customer } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export class CustomerLoader {
  readonly customer: DataLoader<string, Customer | null>;

  constructor(repository: Repository) {
    this.customer = new DataLoader(async (ids) =>
      mapById(ids, await repository.customer.getByIds(ids))
    );
  }
}
