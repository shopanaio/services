import { Inject, Injectable } from "@nestjs/common";
import type { AppConfigurationResolver } from "@shopana/app-sdk";
import { AppInstallationStore } from "../control-plane/AppInstallationStore.js";
import { AppContextRunner } from "./AppContextRunner.js";

@Injectable()
export class AppConfigurationResolverFactory {
  constructor(
    @Inject(AppInstallationStore)
    private readonly installations: AppInstallationStore,
  ) {}

  create(
    appCode: string,
    contextRunner: AppContextRunner,
  ): AppConfigurationResolver {
    return Object.freeze({
      resolve: async (): Promise<Readonly<Record<string, unknown>>> => {
        const context = contextRunner.current();
        if (context.appCode !== appCode) {
          throw new Error(
            `App configuration context mismatch: expected "${appCode}", received "${context.appCode}"`,
          );
        }
        const installation = await this.installations.findById(
          context.installationId,
        );
        if (!installation || installation.appCode !== appCode) {
          throw new Error("App installation configuration is not available");
        }
        return Object.freeze({ ...installation.configuration });
      },
    });
  }
}
