import DataLoader from "dataloader";
import type { CustomerComparison, CustomerComparisonItem } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { groupByKey, mapById } from "./batch.js";

export class CustomerComparisonLoader {
  readonly comparison: DataLoader<string, CustomerComparison | null>;
  readonly comparisonByCustomer: DataLoader<string, CustomerComparison | null>;
  readonly comparisonItem: DataLoader<string, CustomerComparisonItem | null>;
  readonly comparisonItems: DataLoader<string, CustomerComparisonItem[]>;

  constructor(repository: Repository) {
    this.comparison = new DataLoader(async (ids) =>
      mapById(ids, await repository.comparison.getByIds(ids)),
    );
    this.comparisonByCustomer = new DataLoader(async (customerIds) => {
      const rows = await repository.comparison.getByCustomerIds(customerIds);
      const byCustomerId = new Map(rows.map((row) => [row.customerId, row]));
      return customerIds.map((id) => byCustomerId.get(id) ?? null);
    });
    this.comparisonItem = new DataLoader(async (ids) =>
      mapById(ids, await repository.comparison.getItemsByIds(ids)),
    );
    this.comparisonItems = new DataLoader(async (comparisonIds) =>
      groupByKey(
        comparisonIds,
        await repository.comparison.getItemsByComparisonIds(comparisonIds),
        (item) => item.comparisonId,
      ),
    );
  }
}
