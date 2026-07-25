import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type {
  NotificationEffectiveTemplateView,
  NotificationTemplateQueryParams,
} from "./dto/index.js";

export class NotificationTemplateQueryScript extends BaseAdminScript<
  NotificationTemplateQueryParams,
  NotificationEffectiveTemplateView
> {
  protected async execute(
    params: NotificationTemplateQueryParams
  ): Promise<NotificationEffectiveTemplateView> {
    return this.renderer.getEffectiveTemplate(params);
  }
}
