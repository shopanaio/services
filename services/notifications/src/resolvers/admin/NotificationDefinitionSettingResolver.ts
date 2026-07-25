import type { NotificationDefinitionKey } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { SettingsRepository } from "../../repositories/settings/SettingsRepository.js";
import { NotificationsType } from "./NotificationsType.js";

type NotificationDefinitionSetting = NonNullable<
  Awaited<ReturnType<SettingsRepository["getDefinitionSetting"]>>
>;

export class NotificationDefinitionSettingResolver extends NotificationsType<
  NotificationDefinitionKey,
  NotificationDefinitionSetting
> {
  async $preload() {
    const setting =
      await this.$ctx.kernel.repository.settings.getDefinitionSetting(
        this.$props
      );
    if (!setting) {
      throw new PreloadNotFoundError(
        `Notification definition setting ${this.$props} not found`
      );
    }
    return setting;
  }

  definitionKey() {
    return this.$props;
  }

  enabled() {
    return this.$get("enabled");
  }

  version() {
    return this.$get("version");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
