import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type {
  StaffRecipientUpsertParams,
  StaffRecipientWriteView,
} from "./dto/index.js";

export interface StaffRecipientUpsertResult {
  recipient?: StaffRecipientWriteView;
  userErrors: AdminUserError[];
}

export class StaffRecipientUpsertScript extends BaseScript<
  StaffRecipientUpsertParams,
  StaffRecipientUpsertResult
> {
  @Transactional()
  protected async execute(
    params: StaffRecipientUpsertParams
  ) {
    for (const key of params.eventKeys) {
      if (this.definitions.get(key).audience !== "STAFF") {
        throw new Error(`NOT_A_STAFF_NOTIFICATION:${key}`);
      }
    }
    const recipient = await this.repository.staff.upsert(params);
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      params.id ? "staff.recipient.updated" : "staff.recipient.created",
      "staffRecipient",
      recipient.id,
      { eventKeys: recipient.eventKeys, enabled: recipient.enabled }
    );
    return { recipient, userErrors: [] };
  }

  protected handleError(error: unknown): StaffRecipientUpsertResult {
    return { recipient: undefined, userErrors: adminUserErrors(error) };
  }
}
