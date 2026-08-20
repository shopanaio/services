import { FatalError } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";
import type { SecretProvider } from "./SecretProvider.js";

export class EnvSecretProvider implements SecretProvider {
  async resolve(secretRef: string): Promise<string> {
    const { service } = getServiceConfig("media");
    const value = service.secrets?.[secretRef];
    if (!value) {
      throw new FatalError(
        `CDN secret "${secretRef}" is not configured`,
        undefined,
        "CDN_SECRET_NOT_FOUND",
      );
    }
    return value;
  }
}
