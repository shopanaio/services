import { NotificationsType } from "./NotificationsType.js";
import type {
  NotificationEffectiveTemplateView,
  NotificationTemplateQueryParams,
} from "../../scripts/template/dto/index.js";
import { toGraphQLChannel } from "./mappers.js";

export class NotificationEffectiveTemplateResolver extends NotificationsType<
  NotificationTemplateQueryParams,
  NotificationEffectiveTemplateView
> {
  $preload() {
    return this.$ctx.loaders.effectiveTemplate.load(this.$props);
  }

  key() {
    return this.$props.key;
  }

  async channel() {
    return toGraphQLChannel(await this.$get("channel"));
  }

  async locale() {
    return this.$get("locale");
  }

  async source() {
    return this.$get("source");
  }

  async subjectTemplate() {
    return (await this.$get("subjectTemplate")) ?? null;
  }

  async bodyTemplate() {
    return this.$get("bodyTemplate");
  }

  async plainTextTemplate() {
    return (await this.$get("plainTextTemplate")) ?? null;
  }

  async revisionId() {
    return (await this.$get("revisionId")) ?? null;
  }

  async revision() {
    return (await this.$get("revision")) ?? null;
  }

  async sourceVersion() {
    return (await this.$get("sourceVersion")) ?? null;
  }
}
