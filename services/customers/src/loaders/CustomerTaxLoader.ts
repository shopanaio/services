import DataLoader from "dataloader";
import type { CustomerTaxExemption, CustomerTaxIdentifier } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export class CustomerTaxLoader {
  readonly taxIdentifier: DataLoader<string, CustomerTaxIdentifier | null>;
  readonly taxExemption: DataLoader<string, CustomerTaxExemption | null>;

  constructor(repository: Repository) {
    this.taxIdentifier = new DataLoader(async (ids) =>
      mapById(ids, await repository.taxIdentifier.getByIds(ids)),
    );
    this.taxExemption = new DataLoader(async (ids) =>
      mapById(ids, await repository.taxExemption.getByIds(ids)),
    );
  }
}
