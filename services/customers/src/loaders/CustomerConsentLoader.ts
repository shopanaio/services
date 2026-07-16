import DataLoader from "dataloader";
import type {
  CustomerConsent,
  CustomerConsentEvent,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import { groupByKey, mapById } from "./batch.js";

export class CustomerConsentLoader {
  readonly consent: DataLoader<string, CustomerConsent | null>;
  readonly consentEvent: DataLoader<string, CustomerConsentEvent | null>;
  readonly consentsByCustomer: DataLoader<string, CustomerConsent[]>;

  constructor(repository: Repository) {
    this.consent = new DataLoader(async (ids) =>
      mapById(ids, await repository.consent.getByIds(ids))
    );
    this.consentEvent = new DataLoader(async (ids) =>
      mapById(ids, await repository.consent.getEventsByIds(ids))
    );
    this.consentsByCustomer = new DataLoader(async (customerIds) =>
      groupByKey(
        customerIds,
        await repository.consent.getByCustomerIds(customerIds),
        (row) => row.customerId
      )
    );
  }
}
