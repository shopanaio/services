import { createHmac, randomBytes } from "node:crypto";
import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import { and, desc, eq } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  webhookSecretVersions,
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
    const secret = await this.rotateSecret(id, input.createdBy, 0);
    return { subscription: rows[0]!, secret };
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

  async rotateSecret(
    subscriptionId: string,
    createdBy?: string,
    gracePeriodHours = 24
  ): Promise<string> {
    const subscription = (
      await this.connection
        .select()
        .from(webhookSubscriptions)
        .where(
          and(
            eq(webhookSubscriptions.storeId, this.storeId),
            eq(webhookSubscriptions.id, subscriptionId)
          )
        )
        .limit(1)
    )[0];
    if (!subscription) throw new Error("WEBHOOK_NOT_FOUND");

    const current = await this.connection
      .select()
      .from(webhookSecretVersions)
      .where(
        and(
          eq(webhookSecretVersions.storeId, this.storeId),
          eq(webhookSecretVersions.subscriptionId, subscriptionId),
          eq(webhookSecretVersions.active, true)
        )
      )
      .orderBy(desc(webhookSecretVersions.version));
    const now = Date.now();
    if (current.length > 0) {
      await this.connection
        .update(webhookSecretVersions)
        .set({
          active: false,
          graceExpiresAt: new Date(
            now + gracePeriodHours * 60 * 60 * 1_000
          ).toISOString(),
        })
        .where(
          and(
            eq(webhookSecretVersions.storeId, this.storeId),
            eq(webhookSecretVersions.subscriptionId, subscriptionId),
            eq(webhookSecretVersions.active, true)
          )
        );
    }

    const secret = randomBytes(32).toString("base64url");
    await this.connection.insert(webhookSecretVersions).values({
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      subscriptionId,
      version: (current[0]?.version ?? 0) + 1,
      secretCiphertext: this.protection.encrypt(secret),
      active: true,
      createdBy,
    });
    return secret;
  }

  async getSigningSecrets(subscriptionId: string): Promise<string[]> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .select()
      .from(webhookSecretVersions)
      .where(
        and(
          eq(webhookSecretVersions.storeId, this.storeId),
          eq(webhookSecretVersions.subscriptionId, subscriptionId)
        )
      )
      .orderBy(desc(webhookSecretVersions.version));
    return rows
      .filter(
        (row) =>
          row.active ||
          (row.graceExpiresAt !== null && row.graceExpiresAt > now)
      )
      .map((row) => this.protection.decrypt(row.secretCiphertext));
  }

  async revealSecret(subscriptionId: string): Promise<string> {
    const rows = await this.connection
      .select()
      .from(webhookSecretVersions)
      .where(
        and(
          eq(webhookSecretVersions.storeId, this.storeId),
          eq(webhookSecretVersions.subscriptionId, subscriptionId),
          eq(webhookSecretVersions.active, true)
        )
      )
      .orderBy(desc(webhookSecretVersions.version))
      .limit(1);
    const current = rows[0];
    if (!current) throw new Error("WEBHOOK_SIGNING_SECRET_NOT_FOUND");
    return this.protection.decrypt(current.secretCiphertext);
  }

  async sign(
    subscriptionId: string,
    timestamp: string,
    deliveryId: string,
    body: string
  ): Promise<string> {
    const secret = (await this.getSigningSecrets(subscriptionId))[0];
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
