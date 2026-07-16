import DataLoader from "dataloader";
import type {
  CustomerSegment,
  CustomerSegmentMembership,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { mapById } from "./batch.js";

export class CustomerSegmentLoader {
  readonly segment: DataLoader<string, CustomerSegment | null>;
  readonly segmentMembership: DataLoader<
    string,
    CustomerSegmentMembership | null
  >;
  readonly segmentCustomersCount: DataLoader<string, number>;

  constructor(repository: Repository) {
    this.segment = new DataLoader(async (ids) =>
      mapById(ids, await repository.segment.getByIds(ids))
    );
    this.segmentMembership = new DataLoader(async (ids) =>
      mapById(ids, await repository.segment.getMembershipsByIds(ids))
    );
    this.segmentCustomersCount = new DataLoader(async (segmentIds) => {
      const counts =
        await repository.segment.countCurrentCustomersBySegmentIds(segmentIds);
      return segmentIds.map((segmentId) => counts.get(segmentId) ?? 0);
    });
  }
}
