import { Inject, Injectable } from "@nestjs/common";
import type { AppSecretResolver } from "@shopana/app-sdk";
import { AppInstallationSecretStore } from "../control-plane/AppInstallationSecretStore.js";
import { AppContextRunner } from "./AppContextRunner.js";

@Injectable()
export class AppSecretResolverFactory {
  constructor(
    @Inject(AppInstallationSecretStore)
    private readonly secrets: AppInstallationSecretStore,
  ) {}

  create(appCode: string, contextRunner: AppContextRunner): AppSecretResolver {
    return Object.freeze({
      resolve: async (name: string): Promise<string> => {
        const context = contextRunner.current();
        if (context.appCode !== appCode) {
          throw new Error(
            `App secret context mismatch: expected "${appCode}", received "${context.appCode}"`,
          );
        }
        return this.secrets.resolve(context.installationId, appCode, name);
      },
    });
  }
}
