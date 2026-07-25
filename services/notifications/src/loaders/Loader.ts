import type { NotificationTemplateRenderer } from "../infrastructure/templates/NotificationTemplateRenderer.js";
import type { Repository } from "../repositories/Repository.js";
import { SettingsLoader } from "./SettingsLoader.js";
import { TemplateLoader } from "./TemplateLoader.js";
import { WebhookLoader } from "./WebhookLoader.js";

export class Loader {
  public readonly definitionSetting: SettingsLoader["definitionSetting"];
  public readonly channelSetting: SettingsLoader["channelSetting"];
  public readonly effectiveTemplate: TemplateLoader["effectiveTemplate"];
  public readonly webhook: WebhookLoader["webhook"];

  constructor(
    repository: Repository,
    renderer: NotificationTemplateRenderer
  ) {
    const settings = new SettingsLoader(repository);
    const templates = new TemplateLoader(renderer);
    const webhooks = new WebhookLoader(repository);

    this.definitionSetting = settings.definitionSetting;
    this.channelSetting = settings.channelSetting;
    this.effectiveTemplate = templates.effectiveTemplate;
    this.webhook = webhooks.webhook;
  }
}
