import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  StaffRecipientUpsertParams,
  StaffRecipientWriteView,
} from "./dto/index.js";

export class StaffRecipientUpsertScript extends BaseAdminScript<
  StaffRecipientUpsertParams,
  StaffRecipientWriteView
> {
  @Transactional()
  protected async execute(
    params: StaffRecipientUpsertParams
  ): Promise<StaffRecipientWriteView> {
    await this.authorize(
      "notification_recipient",
      params.id ? "update" : "create"
    );
    for (const key of params.eventKeys) {
      if (this.definitions.get(key).audience !== "STAFF") {
        throw new Error(`NOT_A_STAFF_NOTIFICATION:${key}`);
      }
    }
    const recipient = await this.repository.staff.upsert(params);
    await this.audit(
      params.id ? "staff.recipient.updated" : "staff.recipient.created",
      "staffRecipient",
      recipient.id,
      { eventKeys: recipient.eventKeys, enabled: recipient.enabled }
    );
    return recipient;
  }
}
