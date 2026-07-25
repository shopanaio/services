import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationDefinitionSetEnabledParams,
  NotificationDefinitionSettingView,
} from "./dto/index.js";

export class NotificationDefinitionSetEnabledScript extends BaseAdminScript<
  NotificationDefinitionSetEnabledParams,
  NotificationDefinitionSettingView
> {
  @Transactional()
  protected async execute(
    params: NotificationDefinitionSetEnabledParams
  ): Promise<NotificationDefinitionSettingView> {
    const definition = this.definitions.get(params.key);
    if (!definition.optional && !params.enabled) {
      throw new Error("MANDATORY_NOTIFICATION_CANNOT_BE_DISABLED");
    }
    const setting = await this.repository.settings.setDefinitionEnabled({
      ...params,
      updatedBy: this.context.user.id,
    });
    await this.audit("definition.setting.updated", "definition", params.key, {
      enabled: params.enabled,
      version: setting.version,
    });
    return setting;
  }
}
