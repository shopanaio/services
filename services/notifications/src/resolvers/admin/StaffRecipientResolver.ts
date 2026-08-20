import type { StaffRecipientView } from "../../repositories/staff/StaffRepository.js";
import { NotificationsType } from "./NotificationsType.js";

export class StaffRecipientResolver extends NotificationsType<
  StaffRecipientView,
  StaffRecipientView
> {
  $preload() {
    return this.$props;
  }

  id() {
    return this.$props.id;
  }

  async userId() {
    return (await this.$get("userId")) ?? null;
  }

  name() {
    return this.$get("name");
  }
  email() {
    return this.$get("email");
  }
  locale() {
    return this.$get("locale");
  }
  timezone() {
    return this.$get("timezone");
  }
  scope() {
    return this.$get("scope");
  }
  enabled() {
    return this.$get("enabled");
  }
  eventKeys() {
    return this.$get("eventKeys");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}
