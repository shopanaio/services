import { KernelError } from "@shopana/shared-kernel";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";

export interface StaffRecipientDeleteResult {
  deletedStaffRecipientId?: string;
  userErrors: AdminUserError[];
}

export class StaffRecipientDeleteScript extends BaseScript<
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
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "staff.recipient.deleted",
      "staffRecipient",
      params.id
    );
    return { deletedStaffRecipientId: params.id, userErrors: [] };
  }

  protected handleError(error: unknown): StaffRecipientDeleteResult {
    return {
      deletedStaffRecipientId: undefined,
      userErrors: adminUserErrors(error),
    };
  }
}
