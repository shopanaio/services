import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminMutationScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationDefinitionSetEnabledParams,
  NotificationDefinitionSettingView,
} from "./dto/index.js";

export class NotificationDefinitionSetEnabledScript extends BaseAdminMutationScript<
  NotificationDefinitionSetEnabledParams,
  NotificationDefinitionSettingView
> {
  @Transactional()
  protected async execute(
    params: NotificationDefinitionSetEnabledParams
  ) {
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
    return this.success(setting);
  }
}
