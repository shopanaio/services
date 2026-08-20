import DataLoader from "dataloader";
import type {
  CustomerMonetaryStatistics,
  CustomerStatistics,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export class CustomerStatisticsLoader {
  readonly statisticsByCustomer: DataLoader<string, CustomerStatistics | null>;
  readonly monetaryStatistics: DataLoader<string, CustomerMonetaryStatistics | null>;

  constructor(repository: Repository) {
    this.statisticsByCustomer = new DataLoader(async (customerIds) => {
      const rows = await repository.statistics.getByCustomerIds(customerIds);
      const rowsByCustomer = new Map(rows.map((row) => [row.customerId, row]));
      return customerIds.map((customerId) => rowsByCustomer.get(customerId) ?? null);
    });
    this.monetaryStatistics = new DataLoader(async (ids) =>
      mapById(ids, await repository.statistics.getMonetaryByIds(ids)),
    );
  }
}
