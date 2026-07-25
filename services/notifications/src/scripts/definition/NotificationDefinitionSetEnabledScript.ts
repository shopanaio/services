import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type {
  NotificationDefinitionSetEnabledParams,
  NotificationDefinitionSettingView,
} from "./dto/index.js";

export interface NotificationDefinitionSetEnabledResult {
  setting?: NotificationDefinitionSettingView;
  userErrors: AdminUserError[];
}

export class NotificationDefinitionSetEnabledScript extends BaseScript<
  NotificationDefinitionSetEnabledParams,
  NotificationDefinitionSetEnabledResult
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
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "definition.setting.updated",
      "definition",
      params.key,
      { enabled: params.enabled, version: setting.version }
    );
    return { setting, userErrors: [] };
  }

  protected handleError(error: unknown): NotificationDefinitionSetEnabledResult {
    return { setting: undefined, userErrors: adminUserErrors(error) };
  }
}
