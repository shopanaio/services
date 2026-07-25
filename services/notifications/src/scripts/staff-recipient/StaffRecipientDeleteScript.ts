import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { StaffRecipientDeleteResult } from "./dto/index.js";

export class StaffRecipientDeleteScript extends BaseAdminScript<
  { id: string },
  StaffRecipientDeleteResult
> {
  @Transactional()
  protected async execute(params: {
    id: string;
  }): Promise<StaffRecipientDeleteResult> {
    await this.authorize("notification_recipient", "delete");
    const deleted = await this.repository.staff.delete(params.id);
    if (deleted) {
      await this.audit(
        "staff.recipient.deleted",
        "staffRecipient",
        params.id
      );
    }
    return { deleted };
  }
}
