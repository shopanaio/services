import { Injectable } from "@nestjs/common";
import type {
  AppContextResolutionReference,
  AppExecutionContext,
  AppInstallationContextProvider,
} from "@shopana/app-sdk";

export const APP_INSTALLATION_CONTEXT_PROVIDER = Symbol(
  "APP_INSTALLATION_CONTEXT_PROVIDER",
);

@Injectable()
export class UnavailableAppInstallationContextProvider
  implements AppInstallationContextProvider
{
  async resolve(
    reference: Readonly<AppContextResolutionReference>,
  ): Promise<Readonly<AppExecutionContext>> {
    throw new Error(
      `App installation context "${reference.installationId}" is not available yet`,
    );
  }
}
