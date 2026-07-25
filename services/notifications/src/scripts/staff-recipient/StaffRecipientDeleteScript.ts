import { KernelError } from "@shopana/shared-kernel";
import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type { StaffRecipientDeleteResult } from "./dto/index.js";

export class StaffRecipientDeleteScript extends BaseAdminMutationScript<
  { id: string },
  StaffRecipientDeleteResult
> {
  @Transactional()
  protected async execute(params: { id: string }) {
    const deleted = await this.repository.staff.delete(params.id);
    if (!deleted) {
      throw new KernelError(
        "Staff notification recipient was not found",
        "STAFF_RECIPIENT_NOT_FOUND"
      );
    }
    await this.audit(
      "staff.recipient.deleted",
      "staffRecipient",
      params.id
    );
    return this.success({ deleted: true });
  }
}
