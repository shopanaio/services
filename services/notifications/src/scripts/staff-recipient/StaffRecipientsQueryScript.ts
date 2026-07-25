import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { StaffRecipientListView } from "./dto/index.js";

export class StaffRecipientsQueryScript extends BaseAdminScript<
  Record<string, never>,
  StaffRecipientListView
> {
  protected async execute(): Promise<StaffRecipientListView> {
    return this.repository.staff.list();
  }
}
