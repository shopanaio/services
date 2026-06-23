import DataLoader from "dataloader";
import type { Vendor } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class VendorLoader {
  public readonly vendor: DataLoader<string, Vendor | null>;

  constructor(repository: Repository) {
    this.vendor = new DataLoader<string, Vendor | null>(async (vendorIds) => {
      const results = await repository.vendor.getByIds(vendorIds);
      return vendorIds.map(
        (id) => results.find((vendor) => vendor.id === id) ?? null
      );
    });
  }
}
