import type { NotificationChannel, NotificationDefinitionKey } from "@shopana/broker-types";
import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import type { SettingsRepository } from "../repositories/settings/SettingsRepository.js";

export interface NotificationChannelSettingKey {
  key: NotificationDefinitionKey;
  channel: NotificationChannel;
}

export function notificationChannelSettingKey(key: NotificationChannelSettingKey): string {
  return JSON.stringify([key.key, key.channel]);
}

export class SettingsLoader {
  public readonly definitionSetting: DataLoader<
    NotificationDefinitionKey,
    Awaited<ReturnType<SettingsRepository["getDefinitionSetting"]>> | null
  >;
  public readonly channelSetting: DataLoader<
    NotificationChannelSettingKey,
    Awaited<ReturnType<SettingsRepository["getChannelSetting"]>> | null,
    string
  >;

  constructor(repository: Repository) {
    this.definitionSetting = new DataLoader<
      NotificationDefinitionKey,
      Awaited<ReturnType<SettingsRepository["getDefinitionSetting"]>> | null
    >(async (keys) => {
      const settings = await repository.settings.getDefinitionSettings(keys);
      const settingsByKey = new Map(settings.map((setting) => [setting.definitionKey, setting]));
      return keys.map((key) => settingsByKey.get(key) ?? null);
    });

    this.channelSetting = new DataLoader<
      NotificationChannelSettingKey,
      Awaited<ReturnType<SettingsRepository["getChannelSetting"]>> | null,
      string
    >(
      async (keys) => {
        const settings = await repository.settings.getChannelSettings(keys);
        const settingsByKey = new Map(
          settings.map((setting) => [
            notificationChannelSettingKey({
              key: setting.definitionKey as NotificationDefinitionKey,
              channel: setting.channel,
            }),
            setting,
          ]),
        );
        return keys.map((key) => settingsByKey.get(notificationChannelSettingKey(key)) ?? null);
      },
      { cacheKeyFn: notificationChannelSettingKey },
    );
  }
}
