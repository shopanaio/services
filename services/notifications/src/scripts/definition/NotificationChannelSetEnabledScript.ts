import { z } from "zod";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type {
  NotificationChannelSetEnabledParams,
  NotificationChannelSettingWriteView,
} from "./dto/index.js";

export interface NotificationChannelSetEnabledResult {
  setting?: NotificationChannelSettingWriteView;
  userErrors: AdminUserError[];
}

export class NotificationChannelSetEnabledScript extends BaseScript<
  NotificationChannelSetEnabledParams,
  NotificationChannelSetEnabledResult
> {
  @Transactional()
  protected async execute(params: NotificationChannelSetEnabledParams) {
    const definition = this.definitions.get(params.key);
    if (!definition.allowedChannels.includes(params.channel)) {
      throw new Error("CHANNEL_NOT_ALLOWED");
    }
    if (params.channel !== "EMAIL" && (params.senderEmail || params.senderName || params.replyTo)) {
      throw new Error("SENDER_SETTINGS_REQUIRE_EMAIL_CHANNEL");
    }
    if (params.senderEmail) {
      z.object({ senderEmail: z.string().email() }).parse({
        senderEmail: params.senderEmail,
      });
    }
    if (params.replyTo) {
      z.object({ replyTo: z.string().email() }).parse({
        replyTo: params.replyTo,
      });
    }
    const setting = await this.repository.settings.setChannelEnabled(params);
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "channel.setting.updated",
      "definition",
      params.key,
      { channel: params.channel, enabled: params.enabled },
    );
    return { setting, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationChannelSetEnabledResult {
    return { setting: undefined, userErrors: adminUserErrors(error) };
  }
}
