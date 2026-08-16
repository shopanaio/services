import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";
import { createHash } from "node:crypto";
import type { Media } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { DeliveryProviderAssetsPort } from "../../contracts/ports.js";

export class BrokerDeliveryProviderAssetsAdapter implements DeliveryProviderAssetsPort {
  constructor(private readonly broker: ServiceBroker) {}

  async ingestLabel(input: Parameters<DeliveryProviderAssetsPort["ingestLabel"]>[0]): Promise<Awaited<ReturnType<DeliveryProviderAssetsPort["ingestLabel"]>>> {
    try {
      const url = new URL(input.label.downloadUrl);
      if (url.protocol !== "https:" || url.username || url.password || url.port && !input.policy.allowedPorts.includes(Number(url.port))) {
        return rejected("DELIVERY_LABEL_URL_REJECTED", "The label URL is outside the HTTPS policy");
      }
      if (!input.policy.allowedHosts.includes(url.hostname.toLowerCase())) {
        return rejected("DELIVERY_LABEL_HOST_REJECTED", "The label host is not allow-listed");
      }
      const addresses = await lookup(url.hostname, { all: true, verbatim: true });
      const address = addresses.find(({ address }) => isPublicAddress(address));
      if (!address || addresses.some(({ address }) => !isPublicAddress(address))) {
        return rejected("DELIVERY_LABEL_DNS_REJECTED", "The label host resolved to a non-public address");
      }
      const expectedMime = mimeType(input.label.format);
      const body = await fetchPinned(url, address.address, address.family, input.policy.maxBytes, input.policy.fetchTimeoutMs, expectedMime);
      if (!matchesFormat(body, input.label.format)) return rejected("DELIVERY_LABEL_CONTENT_INVALID", "The label content does not match its declared format");
      const result = await this.broker.call<Media.UploadGeneratedFileResult, Media.UploadGeneratedFileParams>("media.uploadGeneratedFile", {
        owner: { type: "store", id: input.storeId },
        entityRef: { service: "delivery", entityType: "shipment", entityId: input.shipmentId },
        role: "shipping_label",
        filename: `${input.providerParcelReference}.${input.label.format.toLowerCase()}`,
        mimeType: expectedMime,
        contentBase64: body.toString("base64"),
        idempotencyKey: `delivery-label:${input.shipmentId}:${labelDigest(input.label)}`,
      });
      if (!result.fileId || result.userErrors.length > 0) {
        return rejected(result.userErrors[0]?.code ?? "DELIVERY_LABEL_MEDIA_FAILED", result.userErrors[0]?.message ?? "The label could not be stored", true);
      }
      return {
        status: "INGESTED",
        label: { format: input.label.format, mediaId: result.fileId, assetPolicyRevision: input.policy.revision, expiresAt: input.label.expiresAt },
      };
    } catch (error) {
      return rejected("DELIVERY_LABEL_INGEST_FAILED", error instanceof Error ? error.message : "The label could not be ingested", true);
    }
  }
}

function labelDigest(label: { format: string; downloadUrl: string; expiresAt: string | null }): string {
  return createHash("sha256").update(JSON.stringify(label)).digest("base64url");
}

function rejected(code: string, message: string, retryable = false) {
  return { status: "REJECTED" as const, code, message, retryable };
}

function mimeType(format: "PDF" | "PNG" | "ZPL") {
  return format === "PDF" ? "application/pdf" : format === "PNG" ? "image/png" : "application/zpl";
}

function matchesFormat(body: Buffer, format: "PDF" | "PNG" | "ZPL"): boolean {
  if (format === "PDF") return body.subarray(0, 5).toString("ascii") === "%PDF-";
  if (format === "PNG") return body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return body.subarray(0, 256).toString("utf8").trimStart().startsWith("^XA");
}

async function fetchPinned(url: URL, address: string, family: number, maxBytes: number, timeoutMs: number, expectedMime: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = request({
      protocol: "https:", hostname: address, family, port: Number(url.port || 443), method: "GET",
      path: `${url.pathname}${url.search}`, servername: url.hostname, headers: { host: url.host, accept: expectedMime },
    }, (response) => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`Label endpoint returned ${response.statusCode ?? "no status"}`)); return; }
      const contentType = response.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
      if (contentType !== expectedMime) { response.resume(); reject(new Error("Label content type does not match its declared format")); return; }
      const declared = Number(response.headers["content-length"] ?? 0);
      if (declared > maxBytes) { response.resume(); reject(new Error("Label exceeds the configured size limit")); return; }
      const chunks: Buffer[] = []; let length = 0;
      response.on("data", (chunk: Buffer) => {
        length += chunk.length;
        if (length > maxBytes) { req.destroy(new Error("Label exceeds the configured size limit")); return; }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error("Label fetch timed out")));
    req.on("error", reject);
    req.end();
  });
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 ||
      a === 100 && b! >= 64 && b! <= 127 ||
      a === 169 && b === 254 || a === 172 && b! >= 16 && b! <= 31 ||
      a === 192 && (b === 0 || b === 168) ||
      a === 198 && (b === 18 || b === 19 || b === 51) ||
      a === 203 && b === 0 || a! >= 224
    );
  }
  if (version === 6) {
    const value = address.toLowerCase();
    return value !== "::" && value !== "::1" && !value.startsWith("fe8") && !value.startsWith("fe9") && !value.startsWith("fea") && !value.startsWith("feb") && !value.startsWith("fc") && !value.startsWith("fd") && !value.startsWith("ff") && !value.startsWith("2001:db8") && !value.startsWith("::ffff:");
  }
  return false;
}
