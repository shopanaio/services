import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { getServiceConfig } from "@shopana/shared-service-config";
import { Repository } from "../repositories/Repository.js";

@Injectable()
export class AppInstallationSecretStore {
  private readonly key: Buffer;

  constructor(
    @Inject(Repository)
    private readonly repository: Repository,
  ) {
    const { global } = getServiceConfig("apps");
    const masterKey =
      process.env.APPS_SECRET_MASTER_KEY ??
      (global.environment === "production" ? "" : "shopana-development-apps-secret-key");
    if (!masterKey) {
      throw new Error("APPS_SECRET_MASTER_KEY is required in production");
    }
    this.key = createHash("sha256").update(masterKey).digest();
  }

  async setMany(installationId: string, secrets: Readonly<Record<string, string>>): Promise<void> {
    const encrypted: Record<string, string> = {};
    for (const [name, value] of Object.entries(secrets)) {
      const normalizedName = name.trim();
      if (!normalizedName || normalizedName.length > 128) {
        throw new Error("App installation secret name is invalid");
      }
      encrypted[normalizedName] = this.encrypt(value);
    }
    await this.repository.secret.setMany(installationId, encrypted);
  }

  async resolve(installationId: string, appCode: string, name: string): Promise<string> {
    const row = await this.repository.secret.resolve(installationId, appCode, name);
    if (!row || row.appCode !== appCode) {
      throw new Error(`App installation secret "${name}" is not available`);
    }
    if (row.installationStatus === "UNINSTALLED" || row.installationStatus === "UNINSTALLING") {
      throw new Error(`App installation secret "${name}" has been revoked`);
    }
    return this.decrypt(row.ciphertext);
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  private decrypt(value: string): string {
    const [version, iv, tag, ciphertext] = value.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext) {
      throw new Error("Unsupported App installation secret ciphertext");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
