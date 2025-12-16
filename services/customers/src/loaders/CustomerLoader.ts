import DataLoader from "dataloader";
import type { Customer } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class CustomerLoader {
  public readonly customer: DataLoader<string, Customer | null>;

  constructor(repository: Repository) {
    this.customer = new DataLoader<string, Customer | null>(async (customerIds) => {
      const results = await repository.customer.getByIds(customerIds);
      return customerIds.map((id) => results.find((c) => c.id === id) ?? null);
    });
  }
}
