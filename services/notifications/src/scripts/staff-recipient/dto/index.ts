import type { NotificationDefinitionKey } from "@shopana/broker-types";
import type {
  StaffRecipientView,
  StaffRepository,
} from "../../../repositories/staff/StaffRepository.js";

export interface StaffRecipientUpsertParams {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  locale: string;
  timezone: string;
  enabled: boolean;
  eventKeys: NotificationDefinitionKey[];
}

export type StaffRecipientListView = StaffRecipientView[];

export type StaffRecipientWriteView = Awaited<
  ReturnType<StaffRepository["upsert"]>
>;
