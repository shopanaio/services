import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationPreviewParams,
  NotificationPreviewView,
} from "./dto/index.js";

export class NotificationPreviewScript extends BaseAdminScript<
  NotificationPreviewParams,
  NotificationPreviewView
> {
  protected async execute(
    params: NotificationPreviewParams
  ): Promise<NotificationPreviewView> {
    await this.authorize("notification_template", "preview");
    return this.renderer.preview(params);
  }
}
