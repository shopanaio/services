import { KernelError } from "@shopana/shared-kernel";
import { Transactional } from "../../kernel/BaseScript.js";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationEffectiveTemplateView,
  NotificationTemplateUpdateParams,
} from "./dto/index.js";

export class NotificationTemplateUpdateScript extends BaseAdminScript<
  NotificationTemplateUpdateParams,
  NotificationEffectiveTemplateView
> {
  @Transactional()
  protected async execute(
    params: NotificationTemplateUpdateParams
  ): Promise<NotificationEffectiveTemplateView> {
    await this.authorize("notification_template", "update");
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
    await this.audit("template.updated", "templateRevision", revision.id, {
      key: params.key,
      channel: params.channel,
      locale: params.locale,
      revision: revision.revision,
      pointerVersion: pointer.version,
    });
    return this.renderer.getEffectiveTemplate(params);
  }
}
