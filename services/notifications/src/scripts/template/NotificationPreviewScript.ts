import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationPreviewParams,
  NotificationPreviewView,
} from "./dto/index.js";

export class NotificationPreviewScript extends BaseAdminMutationScript<
  NotificationPreviewParams,
  NotificationPreviewView
> {
  protected async execute(
    params: NotificationPreviewParams
  ) {
    return this.success(await this.renderer.preview(params));
  }
}
