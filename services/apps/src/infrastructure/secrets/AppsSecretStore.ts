import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { rawSql, single } from "@event-driven-io/dumbo";
import type { SQLExecutor } from "@event-driven-io/dumbo";
import type { Knex } from "knex";

interface SecretRow {
  id: string;
  store_id: string;
  provider_config_id: string;
  name: string;
  ciphertext: string;
}

export class AppsSecretStore {
  private readonly key: Buffer;

  constructor(
    private readonly executor: SQLExecutor,
    private readonly knex: Knex,
    masterKey: string
  ) {
    this.key = createHash("sha256").update(masterKey).digest();
  }

  async set(params: {
    storeId: string;
    providerConfigId: string;
    name: string;
    value: string;
  }): Promise<{ $secret: string }> {
    const ciphertext = this.encrypt(params.value);
    const query = this.knex
      .insert({
        store_id: params.storeId,
        provider_config_id: params.providerConfigId,
        name: params.name,
        ciphertext,
      })
      .withSchema("platform")
      .into("provider_secrets")
      .onConflict(["provider_config_id", "name"])
      .merge({
        ciphertext,
        version: this.knex.raw("provider_secrets.version + 1"),
        updated_at: this.knex.raw("now()"),
      })
      .returning("id")
      .toString();
    const row = await single(
      this.executor.query<{ id: string }>(rawSql(query))
    );
    await this.audit(params.storeId, params.providerConfigId, params.name, "SET");
    return { $secret: `apps:${params.storeId}:${row.id}` };
  }

  async resolve(
    reference: string,
    expectedStoreId?: string
  ): Promise<string | undefined> {
    const [namespace, storeId, id, ...rest] = reference.split(":");
    if (namespace !== "apps" || !storeId || !id || rest.length > 0) {
      return undefined;
    }
    if (!expectedStoreId || expectedStoreId !== storeId) {
      return undefined;
    }

    const query = this.knex
      .select([
        "id",
        "store_id",
        "provider_config_id",
        "name",
        "ciphertext",
      ])
      .from("platform.provider_secrets")
      .where({ id, store_id: storeId })
      .limit(1)
      .toString();
    const { rows } = await this.executor.query<SecretRow>(rawSql(query));
    const row = rows[0];
    if (!row) return undefined;
    await this.audit(
      row.store_id,
      row.provider_config_id,
      row.name,
      "USE"
    );
    return this.decrypt(row.ciphertext);
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
      throw new Error("Unsupported provider secret ciphertext");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  private async audit(
    storeId: string,
    providerConfigId: string,
    secretName: string,
    action: "SET" | "USE"
  ): Promise<void> {
    const query = this.knex
      .insert({
        store_id: storeId,
        provider_config_id: providerConfigId,
        secret_name: secretName,
        action,
      })
      .withSchema("platform")
      .into("provider_secret_audit_events")
      .toString();
    await this.executor.command(rawSql(query));
  }
}
