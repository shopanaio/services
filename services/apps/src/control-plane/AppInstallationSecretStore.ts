import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import { getServiceConfig } from "@shopana/shared-service-config";
import { knexInstance } from "../infrastructure/db/database.js";

@Injectable()
export class AppInstallationSecretStore {
  private readonly key: Buffer;

  constructor(private readonly database: Knex = knexInstance) {
    const { global } = getServiceConfig("apps");
    const masterKey =
      process.env.APPS_SECRET_MASTER_KEY ??
      (global.environment === "production"
        ? ""
        : "shopana-development-apps-secret-key");
    if (!masterKey) {
      throw new Error("APPS_SECRET_MASTER_KEY is required in production");
    }
    this.key = createHash("sha256").update(masterKey).digest();
  }

  async setMany(
    installationId: string,
    secrets: Readonly<Record<string, string>>,
  ): Promise<void> {
    await this.database.transaction(async (trx) => {
      for (const [name, value] of Object.entries(secrets)) {
        const normalizedName = name.trim();
        if (!normalizedName || normalizedName.length > 128) {
          throw new Error("App installation secret name is invalid");
        }
        await trx("platform.app_installation_secrets")
          .insert({
            installation_id: installationId,
            name: normalizedName,
            ciphertext: this.encrypt(value),
            revoked_at: null,
          })
          .onConflict(["installation_id", "name"])
          .merge({
            ciphertext: this.encrypt(value),
            version: this.database.raw(
              "app_installation_secrets.version + 1",
            ),
            revoked_at: null,
            updated_at: this.database.fn.now(),
          });
      }
    });
  }

  async resolve(
    installationId: string,
    appCode: string,
    name: string,
  ): Promise<string> {
    const row = await this.database
      .select({
        ciphertext: "s.ciphertext",
        installation_status: "i.status",
        app_code: "i.app_code",
      })
      .from({ s: "platform.app_installation_secrets" })
      .join(
        { i: "platform.app_installations" },
        "i.id",
        "s.installation_id",
      )
      .where({
        "s.installation_id": installationId,
        "s.name": name,
        "i.app_code": appCode,
      })
      .whereNull("s.revoked_at")
      .first();
    if (!row || row.app_code !== appCode) {
      throw new Error(
        `App installation secret "${name}" is not available`,
      );
    }
    if (
      row.installation_status === "UNINSTALLED" ||
      row.installation_status === "UNINSTALLING"
    ) {
      throw new Error(
        `App installation secret "${name}" has been revoked`,
      );
    }
    return this.decrypt(String(row.ciphertext));
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
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
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
