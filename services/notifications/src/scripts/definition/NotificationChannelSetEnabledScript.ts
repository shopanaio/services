import { z } from "zod";
import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationChannelSetEnabledParams,
  NotificationChannelSettingWriteView,
} from "./dto/index.js";

export class NotificationChannelSetEnabledScript extends BaseAdminMutationScript<
  NotificationChannelSetEnabledParams,
  NotificationChannelSettingWriteView
> {
  @Transactional()
  protected async execute(
    params: NotificationChannelSetEnabledParams
  ) {
    const definition = this.definitions.get(params.key);
    if (!definition.allowedChannels.includes(params.channel)) {
      throw new Error("CHANNEL_NOT_ALLOWED");
    }
    if (
      params.channel !== "EMAIL" &&
      (params.senderEmail || params.senderName || params.replyTo)
    ) {
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
    const setting =
      await this.repository.settings.setChannelEnabled(params);
    await this.audit("channel.setting.updated", "definition", params.key, {
      channel: params.channel,
      enabled: params.enabled,
    });
    return this.success(setting);
  }
}
