import { BaseScript } from "../../kernel/BaseScript.js";
import { adminUserErrors, type AdminUserError } from "../shared/adminScriptSupport.js";
import type { NotificationPreviewParams, NotificationPreviewView } from "./dto/index.js";

export interface NotificationPreviewResult {
  preview?: NotificationPreviewView;
  userErrors: AdminUserError[];
}

export class NotificationPreviewScript extends BaseScript<
  NotificationPreviewParams,
  NotificationPreviewResult
> {
  protected async execute(params: NotificationPreviewParams) {
    return {
      preview: await this.renderer.preview(params),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): NotificationPreviewResult {
    return { preview: undefined, userErrors: adminUserErrors(error) };
  }
}
