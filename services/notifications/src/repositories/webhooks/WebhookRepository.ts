import { createHmac, randomBytes } from "node:crypto";
import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import { and, desc, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  webhookStoreSecretVersions,
  webhookSubscriptions,
} from "../models/index.js";

export class WebhookRepository extends BaseRepository {
  async list() {
    return this.connection
      .select()
      .from(webhookSubscriptions)
      .where(eq(webhookSubscriptions.storeId, this.storeId))
      .orderBy(desc(webhookSubscriptions.createdAt));
  }

  async listActiveForEvent(eventType: string) {
    return this.connection
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.storeId, this.storeId),
          eq(webhookSubscriptions.eventType, eventType),
          eq(webhookSubscriptions.status, "ACTIVE")
        )
      );
  }

  async find(id: string) {
    const rows = await this.connection
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.storeId, this.storeId),
          eq(webhookSubscriptions.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getByIds(ids: readonly string[]) {
    return this.connection
      .select()
      .from(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.storeId, this.storeId),
          inArray(webhookSubscriptions.id, [...ids])
        )
      );
  }

  async create(input: {
    eventType: string;
    format: "JSON" | "XML";
    url: string;
    apiVersion: string;
    createdBy?: string;
  }) {
    await assertWebhookUrl(input.url);
    const id = await this.generateUuidV7();
    const rows = await this.connection
      .insert(webhookSubscriptions)
      .values({
        id,
        storeId: this.storeId,
        eventType: input.eventType,
        format: input.format,
        url: input.url,
        apiVersion: input.apiVersion,
      })
      .returning();
    await this.ensureSecret(input.createdBy);
    return rows[0]!;
  }

  async update(input: {
    id: string;
    eventType?: string;
    format?: "JSON" | "XML";
    url?: string;
    apiVersion?: string;
    status?: "ACTIVE" | "DISABLED";
    expectedVersion: number;
  }) {
    if (input.url) await assertWebhookUrl(input.url);
    const rows = await this.connection
      .update(webhookSubscriptions)
      .set({
        eventType: input.eventType,
        format: input.format,
        url: input.url,
        apiVersion: input.apiVersion,
        status: input.status,
        version: input.expectedVersion + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(webhookSubscriptions.storeId, this.storeId),
          eq(webhookSubscriptions.id, input.id),
          eq(webhookSubscriptions.version, input.expectedVersion)
        )
      )
      .returning();
    if (!rows[0]) throw new Error("VERSION_CONFLICT");
    return rows[0];
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(webhookSubscriptions)
      .where(
        and(
          eq(webhookSubscriptions.storeId, this.storeId),
          eq(webhookSubscriptions.id, id)
        )
      )
      .returning({ id: webhookSubscriptions.id });
    return rows.length === 1;
  }

  async getSecretStatus(): Promise<{
    configured: boolean;
    version: number | null;
    rotatedAt: string | null;
  }> {
    const current = (
      await this.connection
        .select()
        .from(webhookStoreSecretVersions)
        .where(
          and(
            eq(webhookStoreSecretVersions.storeId, this.storeId),
            eq(webhookStoreSecretVersions.active, true)
          )
        )
        .orderBy(desc(webhookStoreSecretVersions.version))
        .limit(1)
    )[0];
    return {
      configured: current !== undefined,
      version: current?.version ?? null,
      rotatedAt: current?.createdAt ?? null,
    };
  }

  async ensureSecret(createdBy?: string): Promise<void> {
    const status = await this.getSecretStatus();
    if (!status.configured) {
      await this.rotateSecret(createdBy, 0);
    }
  }

  async rotateSecret(
    createdBy?: string,
    gracePeriodHours = 24
  ): Promise<string> {
    const versions = await this.connection
      .select()
      .from(webhookStoreSecretVersions)
      .where(eq(webhookStoreSecretVersions.storeId, this.storeId))
      .orderBy(desc(webhookStoreSecretVersions.version));
    const current = versions.filter((entry) => entry.active);
    const now = Date.now();
    if (current.length > 0) {
      await this.connection
        .update(webhookStoreSecretVersions)
        .set({
          active: false,
          graceExpiresAt: new Date(
            now + gracePeriodHours * 60 * 60 * 1_000
          ).toISOString(),
        })
        .where(
          and(
            eq(webhookStoreSecretVersions.storeId, this.storeId),
            eq(webhookStoreSecretVersions.active, true)
          )
        );
    }

    const secret = randomBytes(32).toString("base64url");
    await this.connection.insert(webhookStoreSecretVersions).values({
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      version: (versions[0]?.version ?? 0) + 1,
      secretCiphertext: this.protection.encrypt(secret),
      active: true,
      createdBy,
    });
    return secret;
  }

  async getSigningSecrets(): Promise<string[]> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .select()
      .from(webhookStoreSecretVersions)
      .where(eq(webhookStoreSecretVersions.storeId, this.storeId))
      .orderBy(desc(webhookStoreSecretVersions.version));
    return rows
      .filter(
        (row) =>
          row.active ||
          (row.graceExpiresAt !== null && row.graceExpiresAt > now)
      )
      .map((row) => this.protection.decrypt(row.secretCiphertext));
  }

  async revealSecret(): Promise<string> {
    const rows = await this.connection
      .select()
      .from(webhookStoreSecretVersions)
      .where(
        and(
          eq(webhookStoreSecretVersions.storeId, this.storeId),
          eq(webhookStoreSecretVersions.active, true)
        )
      )
      .orderBy(desc(webhookStoreSecretVersions.version))
      .limit(1);
    const current = rows[0];
    if (!current) throw new Error("WEBHOOK_SIGNING_SECRET_NOT_FOUND");
    return this.protection.decrypt(current.secretCiphertext);
  }

  async sign(
    timestamp: string,
    deliveryId: string,
    body: string
  ): Promise<string> {
    const secret = (await this.getSigningSecrets())[0];
    if (!secret) throw new Error("WEBHOOK_SIGNING_SECRET_NOT_FOUND");
    return createHmac("sha256", secret)
      .update(`${timestamp}.${deliveryId}.${body}`)
      .digest("base64url");
  }
}

async function assertWebhookUrl(value: string): Promise<void> {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error(
      "Webhook URL must be HTTPS without credentials and use port 443"
    );
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "metadata.google.internal" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error("Webhook URL uses a forbidden host");
  }
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(normalizedHostname)
    ? [normalizedHostname]
    : (
        await Promise.all([
          resolve4(normalizedHostname).catch(() => []),
          resolve6(normalizedHostname).catch(() => []),
        ])
      ).flat();
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error("Webhook URL resolves to a forbidden network");
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateAddress(mappedIpv4);
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    /^0\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^127\./.test(normalized) ||
    /^169\.254\./.test(normalized) ||
    /^192\.0\.0\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    /^224\./.test(normalized) ||
    /^240\./.test(normalized)
  );
}
