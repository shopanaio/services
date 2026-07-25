import { KernelError } from "@shopana/shared-kernel";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import {
  adminUserErrors,
  recordAdminAudit,
  type AdminUserError,
} from "../shared/adminScriptSupport.js";
import type {
  NotificationEffectiveTemplateView,
  NotificationTemplateUpdateParams,
} from "./dto/index.js";

export interface NotificationTemplateUpdateResult {
  template?: NotificationEffectiveTemplateView;
  userErrors: AdminUserError[];
}

export class NotificationTemplateUpdateScript extends BaseScript<
  NotificationTemplateUpdateParams,
  NotificationTemplateUpdateResult
> {
  @Transactional()
  protected async execute(
    params: NotificationTemplateUpdateParams
  ) {
    if (params.channel !== "EMAIL" && params.channel !== "SMS") {
      throw new Error("CHANNEL_DOES_NOT_SUPPORT_TEMPLATES");
    }
    const issues = this.renderer.validateSources(params);
    if (issues.length > 0) {
      throw new KernelError(
        "Notification template is invalid",
        "INVALID_TEMPLATE",
        { issues }
      );
    }
    const revision = await this.repository.templates.createRevision({
      key: params.key,
      channel: params.channel,
      locale: params.locale,
      subjectTemplate: params.subjectTemplate,
      bodyTemplate: params.bodyTemplate,
      plainTextTemplate: params.plainTextTemplate,
      createdBy: this.context.user.id,
    });
    const pointer = await this.repository.templates.activate({
      revisionId: revision.id,
      expectedVersion: params.expectedVersion,
      updatedBy: this.context.user.id,
    });
    await recordAdminAudit(
      this.repository,
      this.context.user.id,
      "template.updated",
      "templateRevision",
      revision.id,
      {
        key: params.key,
        channel: params.channel,
        locale: params.locale,
        revision: revision.revision,
        pointerVersion: pointer.version,
      }
    );
    return {
      template: await this.renderer.getEffectiveTemplate(params),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): NotificationTemplateUpdateResult {
    return { template: undefined, userErrors: adminUserErrors(error) };
  }
}
