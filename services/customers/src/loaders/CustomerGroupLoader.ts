import DataLoader from "dataloader";
import type { CustomerGroup, CustomerGroupMembership } from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export class CustomerGroupLoader {
  readonly group: DataLoader<string, CustomerGroup | null>;
  readonly groupMembership: DataLoader<string, CustomerGroupMembership | null>;
  readonly groupCustomersCount: DataLoader<string, number>;

  constructor(repository: Repository) {
    this.group = new DataLoader(async (ids) => mapById(ids, await repository.group.getByIds(ids)));
    this.groupMembership = new DataLoader(async (ids) =>
      mapById(ids, await repository.group.getMembershipsByIds(ids)),
    );
    this.groupCustomersCount = new DataLoader(async (groupIds) => {
      const counts = await repository.group.countCurrentCustomersByGroupIds(groupIds);
      return groupIds.map((groupId) => counts.get(groupId) ?? 0);
    });
  }
}
