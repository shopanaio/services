import type {
  InventoryUpdateEntry,
  InventoryUpdateMeta,
  InventoryUpdateTask,
} from '@shopana/import-plugin-sdk';
import { inventoryUpdateEntrySchema } from '@shopana/import-plugin-sdk';
import { gunzip as gunzipCallback } from 'node:zlib';
import { promisify } from 'node:util';
import type { DownloadedInventoryPayload } from './storage';

const gunzip = promisify(gunzipCallback);
const inventoryUpdateEntryListSchema = inventoryUpdateEntrySchema.array().min(1);

interface Logger {
  info(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
  log?(msg: string): void;
}

interface StorageGateway {
  download(descriptor: InventoryUpdateTask['storage']): Promise<DownloadedInventoryPayload>;
}

export async function processInventoryUpdate(
  deps: {
    logger: Logger;
    storageGateway: StorageGateway;
  },
  task: InventoryUpdateTask,
): Promise<void> {
  const { storage, meta } = task;
  const payload = await deps.storageGateway.download(storage);
  const effectiveBuffer = await decompressPayload(payload.buffer, meta?.compression);
  const entries = parseInventoryUpdates(effectiveBuffer);

  deps.logger.info(
    {
      pluginCode: task.source.pluginCode,
      integrationId: task.source.integrationId,
      feedType: task.source.feedType,
      issuedAt: task.issuedAt,
      bucket: storage.bucket,
      objectKey: storage.objectKey,
      items: entries.length,
    },
    'Inventory update task received',
  );
}

async function decompressPayload(
  buffer: Buffer,
  compression: InventoryUpdateMeta['compression'] | undefined,
): Promise<Buffer> {
  if (!compression || compression === 'none') {
    return buffer;
  }

  if (compression === 'gzip') {
    return gunzip(buffer);
  }

  throw new Error(`Unsupported inventory payload compression: ${compression}`);
}

function parseInventoryUpdates(buffer: Buffer): InventoryUpdateEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buffer.toString('utf8'));
  } catch (error) {
    throw new Error(
      `Failed to parse inventory payload JSON: ${error instanceof Error ? error.message : error}`,
    );
  }

  return inventoryUpdateEntryListSchema.parse(parsed);
}
