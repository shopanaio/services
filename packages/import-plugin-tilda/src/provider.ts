import { createHash, randomUUID } from "crypto";
import type { ProviderContextLike, HttpClient } from "@shopana/plugin-sdk";
import type {
  InventoryItem,
  InventoryUpdateEntry,
  InventoryUpdateTask,
  InventoryUpdateMeta,
  InventoryUpdateSource,
  InventoryAvailability,
  MoneyValue,
} from "@shopana/import-plugin-sdk";
import { validateInventoryUpdateTask } from "@shopana/import-plugin-sdk";
import { FacebookFeedHashParser } from "./facebook-feed-hash-parser";
import { FileFacebookFeedReader, UrlFacebookFeedReader } from "./readers";
import type { FacebookFeedReader, FacebookFeedRecord } from "./types";
import type {
  TildaImportConfig,
  TildaFeedConfig,
} from "./config";
import {
  TildaObjectStorage,
  type UploadedObjectDetails,
} from "./storage";

export type TildaFeedSourceOverride =
  | {
      source: "url";
      url: string;
      delimiter?: string;
    }
  | {
      source: "file";
      path: string;
      delimiter?: string;
    };

export interface ListFeedRecordsInput {
  overrideSource?: TildaFeedSourceOverride;
  limit?: number;
}

export interface CreateInventoryUpdateTaskInput
  extends ListFeedRecordsInput {
  integrationId?: string;
  feedId?: string;
  locationId?: string;
  correlationId?: string;
  requestedBy?: string;
  taskId?: string;
  issuedAt?: string;
  feedType?: string;
}

export type TildaFeedRecord = FacebookFeedRecord;

type ProviderContext = ProviderContextLike<HttpClient>;

/**
 * Provider implementation for importing Tilda CSV feeds.
 */
export class TildaImportProvider {
  private static readonly DEFAULT_FEED_TYPE = "facebook_csv";
  private static readonly PAYLOAD_CONTENT_TYPE = "application/json";

  private readonly feedConfig: TildaFeedConfig;
  private readonly storage: TildaObjectStorage;

  public constructor(
    private readonly ctx: ProviderContext,
    private readonly config: TildaImportConfig
  ) {
    this.feedConfig = config.feed;
    this.storage = new TildaObjectStorage(config.storage);
  }

  public readonly import = {
    /**
     * Streams the feed and returns parsed records with hashes.
     */
    listRecords: async (
      input?: ListFeedRecordsInput
    ): Promise<TildaFeedRecord[]> => {
      const { reader, delimiter } = this.resolveSource(
        input?.overrideSource
      );
      const parser = new FacebookFeedHashParser(delimiter);
      const limit = this.normalizeLimit(input?.limit);

      const records: TildaFeedRecord[] = [];
      let processed = 0;

      for await (const record of parser.parse(reader)) {
        records.push(record);
        processed += 1;
        if (limit !== null && processed >= limit) {
          break;
        }
      }

      this.ctx.logger.info(
        {
          processed,
          limit,
          source: this.describeSource(input?.overrideSource),
        },
        "Tilda feed parsed"
      );

      return records;
    },

    /**
     * Returns only feed record hashes for lightweight comparisons.
     */
    listHashes: async (
      input?: ListFeedRecordsInput
    ): Promise<Array<{ id: string; hash: string }>> => {
      const { reader, delimiter } = this.resolveSource(
        input?.overrideSource
      );
      const parser = new FacebookFeedHashParser(delimiter);
      const limit = this.normalizeLimit(input?.limit);

      const hashes: Array<{ id: string; hash: string }> = [];
      let processed = 0;

      for await (const record of parser.parse(reader)) {
        hashes.push({ id: record.id, hash: record.hash });
        processed += 1;
        if (limit !== null && processed >= limit) {
          break;
        }
      }

      this.ctx.logger.info(
        {
          processed,
          limit,
          source: this.describeSource(input?.overrideSource),
        },
        "Tilda feed hashes collected"
      );

      return hashes;
    },
  };

  public readonly inventory = {
    /**
     * Builds a standardized inventory update task ready for inventory service.
     */
    createUpdateTask: async (
      input?: CreateInventoryUpdateTaskInput
    ): Promise<InventoryUpdateTask> => {
      const issuedAt = input?.issuedAt ?? new Date().toISOString();
      const { reader, delimiter } = this.resolveSource(
        input?.overrideSource
      );
      const parser = new FacebookFeedHashParser(delimiter);
      const limit = this.normalizeLimit(input?.limit);
      const taskId = input?.taskId ?? randomUUID();

      const updates: InventoryUpdateEntry[] = [];
      let processed = 0;

      for await (const record of parser.parse(reader)) {
        const entry = this.buildInventoryUpdateEntry(record);
        if (!entry) {
          continue;
        }
        updates.push(entry);
        processed += 1;
        if (limit !== null && processed >= limit) {
          break;
        }
      }

      if (!updates.length) {
        throw new Error("Tilda feed did not produce inventory updates");
      }

      const payloadBuffer = Buffer.from(
        JSON.stringify(updates),
        "utf8"
      );
      const checksum = createHash("sha256")
        .update(payloadBuffer)
        .digest("hex");

      const objectKey = this.storage.buildObjectKey(
        taskId,
        issuedAt
      );

      let uploadResult: UploadedObjectDetails;
      try {
        uploadResult = await this.storage.uploadJson(
          objectKey,
          payloadBuffer,
          {
            contentType: TildaImportProvider.PAYLOAD_CONTENT_TYPE,
            checksumSha256: checksum,
          }
        );
      } catch (error) {
        this.ctx.logger.error(
          {
            error:
              error instanceof Error
                ? error.message
                : String(error),
            bucket: this.storage.getBucket(),
            objectKey,
          },
          "Failed to upload inventory payload to object storage"
        );
        throw error;
      }

      const task: InventoryUpdateTask = {
        source: this.buildInventoryUpdateSource(input),
        storage: {
          provider: "s3",
          bucket: this.storage.getBucket(),
          objectKey: uploadResult.objectKey,
          endpoint: this.storage.getEndpoint(),
          region: this.storage.getRegion(),
          contentType: TildaImportProvider.PAYLOAD_CONTENT_TYPE,
          contentLength: payloadBuffer.byteLength,
          checksum: {
            algorithm: "sha256",
            value: checksum,
          },
          metadata: uploadResult.etag
            ? { etag: uploadResult.etag }
            : undefined,
        },
        issuedAt,
        meta: this.buildInventoryUpdateMeta(
          input,
          taskId,
          updates.length
        ),
      };

      const validated = validateInventoryUpdateTask(task);

      this.ctx.logger.info(
        {
          processed,
          limit,
          issuedAt,
          source: this.describeSource(input?.overrideSource),
          bucket: this.storage.getBucket(),
          objectKey: uploadResult.objectKey,
          size: payloadBuffer.byteLength,
        },
        "Inventory update task prepared from Tilda feed"
      );

      return validated;
    },
  };

  private resolveSource(
    override?: TildaFeedSourceOverride
  ): { reader: FacebookFeedReader; delimiter: string } {
    if (!override) {
      if (this.feedConfig.source === "url") {
        return {
          reader: new UrlFacebookFeedReader(this.feedConfig.url),
          delimiter: this.resolveDelimiter(),
        };
      }

      return {
        reader: new FileFacebookFeedReader(this.feedConfig.path),
        delimiter: this.resolveDelimiter(),
      };
    }

    if (override.source === "url") {
      return {
        reader: new UrlFacebookFeedReader(override.url),
        delimiter: this.resolveDelimiter(override.delimiter),
      };
    }

    return {
      reader: new FileFacebookFeedReader(override.path),
      delimiter: this.resolveDelimiter(override.delimiter),
    };
  }

  private normalizeLimit(limit?: number): number | null {
    if (typeof limit !== "number") {
      return null;
    }
    if (!Number.isFinite(limit) || limit <= 0) {
      return null;
    }
    return Math.floor(limit);
  }

  private describeSource(
    override?: TildaFeedSourceOverride
  ): Record<string, unknown> {
    if (!override) {
      return this.feedConfig.source === "url"
        ? { source: "url", url: this.feedConfig.url }
        : { source: "file", path: this.feedConfig.path };
    }

    return override.source === "url"
      ? { source: "url", url: override.url }
      : { source: "file", path: override.path };
  }

  private resolveDelimiter(override?: string): string {
    return (
      override ?? this.feedConfig.delimiter ?? ";"
    );
  }

  private buildInventoryUpdateEntry(
    record: FacebookFeedRecord
  ): InventoryUpdateEntry | null {
    const item = this.buildInventoryItem(record);
    if (!item) {
      return null;
    }
    return {
      operation: "UPSERT",
      item,
    };
  }

  private buildInventoryItem(
    record: FacebookFeedRecord
  ): InventoryItem | null {
    const sku = this.cleanValue(record.id);
    if (!sku) {
      this.ctx.logger.warn(
        { record },
        "Skipped feed record without SKU identifier"
      );
      return null;
    }

    const values = record.values;
    const item: InventoryItem = {
      sku,
      hash: record.hash,
      sourceId: this.cleanValue(values.item_group_id),
      title: this.cleanValue(values.title),
      description: this.cleanValue(values.description),
      brand: this.cleanValue(values.brand),
      categoryPath: this.parseCategoryPath(values.product_type),
      productUrl: this.normalizeUrl(values.link),
      imageUrl: this.normalizeUrl(values.image_link),
      tags: this.parseTags(values.google_product_category),
      availability: this.parseAvailability(values.availability),
      quantity: this.parseQuantity(values.inventory),
      price: this.parseMoney(values.price),
      salePrice: this.parseMoney(values.sale_price),
      metadata: {
        hash: record.hash,
      },
    };

    return item;
  }

  private buildInventoryUpdateSource(
    input?: CreateInventoryUpdateTaskInput
  ): InventoryUpdateSource {
    return {
      pluginCode: "tilda",
      integrationId: input?.integrationId,
      feedId: input?.feedId,
      locationId: input?.locationId,
      feedType:
        this.cleanValue(input?.feedType) ??
        TildaImportProvider.DEFAULT_FEED_TYPE,
    };
  }

  private buildInventoryUpdateMeta(
    input: CreateInventoryUpdateTaskInput | undefined,
    taskId: string,
    itemCount: number
  ): InventoryUpdateMeta {
    const meta: InventoryUpdateMeta = {
      taskId,
      payloadFormat: "json",
      compression: "none",
      itemCount,
    };
    if (input?.correlationId) {
      meta.correlationId = input.correlationId;
    }
    if (input?.requestedBy) {
      meta.requestedBy = input.requestedBy;
    }
    return meta;
  }

  private parseQuantity(raw?: string): InventoryItem["quantity"] {
    const value = this.cleanValue(raw);
    if (!value) {
      return undefined;
    }
    const normalized = value.replace(/[^0-9.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      this.ctx.logger.warn(
        { raw },
        "Unable to parse quantity for feed record"
      );
      return undefined;
    }
    const available = Math.max(Math.trunc(parsed), 0);
    return { available };
  }

  private parseAvailability(
    raw?: string
  ): InventoryAvailability | undefined {
    const value = this.cleanValue(raw);
    if (!value) {
      return undefined;
    }
    switch (value.toLowerCase()) {
      case "in stock":
      case "instock":
      case "available":
        return "in_stock";
      case "out of stock":
      case "outofstock":
      case "sold out":
        return "out_of_stock";
      case "preorder":
        return "preorder";
      case "backorder":
        return "backorder";
      case "discontinued":
      case "archived":
        return "discontinued";
      default:
        return "unknown";
    }
  }

  private parseMoney(raw?: string): MoneyValue | undefined {
    const value = this.cleanValue(raw);
    if (!value) {
      return undefined;
    }
    const match = value.match(
      /^([-+0-9\s.,]+)\s*([a-zA-Z]{3})$/
    );
    if (!match) {
      this.ctx.logger.warn({ raw }, "Unable to parse price for feed record");
      return undefined;
    }
    const numericPart = match[1]
      .replace(/\s+/g, "")
      .replace(/,/g, "");
    const currency = match[2].toUpperCase();
    const parsed = Number.parseFloat(numericPart);
    if (Number.isNaN(parsed)) {
      this.ctx.logger.warn(
        { raw },
        "Price value could not be converted to number"
      );
      return undefined;
    }
    const amount = Math.round(parsed * 100);
    return { amount, currency };
  }

  private parseCategoryPath(raw?: string): string[] | undefined {
    const value = this.cleanValue(raw);
    if (!value) {
      return undefined;
    }
    const segments = value
      .split(/[>;]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    return segments.length ? segments : undefined;
  }

  private parseTags(raw?: string): string[] | undefined {
    const value = this.cleanValue(raw);
    if (!value) {
      return undefined;
    }
    const tags = value
      .split(/[>,;]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    return tags.length ? tags : undefined;
  }

  private normalizeUrl(raw?: string): string | undefined {
    const value = this.cleanValue(raw);
    if (!value) {
      return undefined;
    }
    try {
      const url = new URL(value);
      return url.toString();
    } catch (error) {
      this.ctx.logger.warn(
        { raw, error: error instanceof Error ? error.message : error },
        "Invalid URL in feed record"
      );
      return undefined;
    }
  }

  private cleanValue(value?: string | null): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
}
