import DataLoader from "dataloader";
import type { CustomerAddress } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { groupByKey, mapById } from "./batch.js";

export class CustomerAddressLoader {
  readonly address: DataLoader<string, CustomerAddress | null>;
  readonly addressesByCustomer: DataLoader<string, CustomerAddress[]>;

  constructor(repository: Repository) {
    this.address = new DataLoader(async (ids) =>
      mapById(ids, await repository.address.getByIds(ids)),
    );
    this.addressesByCustomer = new DataLoader(async (customerIds) =>
      groupByKey(
        customerIds,
        await repository.address.getByCustomerIds(customerIds),
        (row) => row.customerId,
      ),
    );
  }
}
