import DataLoader from "dataloader";
import type { CustomerExternalReference } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { groupByKey, mapById } from "./batch.js";

export class CustomerExternalReferenceLoader {
  readonly externalReference: DataLoader<
    string,
    CustomerExternalReference | null
  >;
  readonly externalReferencesByCustomer: DataLoader<
    string,
    CustomerExternalReference[]
  >;

  constructor(repository: Repository) {
    this.externalReference = new DataLoader(async (ids) =>
      mapById(ids, await repository.externalReference.getByIds(ids))
    );
    this.externalReferencesByCustomer = new DataLoader(async (customerIds) =>
      groupByKey(
        customerIds,
        await repository.externalReference.getByCustomerIds(customerIds),
        (row) => row.customerId
      )
    );
  }
}
