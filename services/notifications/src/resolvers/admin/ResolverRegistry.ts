import type { NotificationChannel, NotificationDefinitionKey } from "@shopana/broker-types";
import type { ServiceContext } from "../../context/types.js";
import type { StaffRecipientView } from "../../repositories/staff/StaffRepository.js";
import type { NotificationTemplateQueryParams } from "../../scripts/template/dto/index.js";
import type { NotificationDefinitionResolverData } from "./NotificationDefinitionResolver.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;

  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async notificationDefinition(data: NotificationDefinitionResolverData) {
    const { NotificationDefinitionResolver } = await import(
      "./NotificationDefinitionResolver.js"
    );
    return new NotificationDefinitionResolver(data, this.ctx);
  }

  async notificationDefinitionSetting(key: NotificationDefinitionKey) {
    const { NotificationDefinitionSettingResolver } = await import(
      "./NotificationDefinitionSettingResolver.js"
    );
    return new NotificationDefinitionSettingResolver(key, this.ctx);
  }

  async notificationChannelSetting(input: {
    key: NotificationDefinitionKey;
    channel: NotificationChannel;
  }) {
    const { NotificationChannelSettingResolver } = await import(
      "./NotificationChannelSettingResolver.js"
    );
    return new NotificationChannelSettingResolver(input, this.ctx);
  }

  async notificationEffectiveTemplate(input: NotificationTemplateQueryParams) {
    const { NotificationEffectiveTemplateResolver } = await import(
      "./NotificationEffectiveTemplateResolver.js"
    );
    return new NotificationEffectiveTemplateResolver(input, this.ctx);
  }

  async staffRecipient(recipient: StaffRecipientView) {
    const { StaffRecipientResolver } = await import(
      "./StaffRecipientResolver.js"
    );
    return new StaffRecipientResolver(recipient, this.ctx);
  }

  async webhook(id: string) {
    const { NotificationWebhookResolver } = await import(
      "./NotificationWebhookResolver.js"
    );
    return new NotificationWebhookResolver(id, this.ctx);
  }
}
