import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { ServiceContext } from "../../../context/types.js";
import {
  CdnDeliveryService,
  type ImageTransformOptions,
} from "../../../infrastructure/cdn/index.js";
import type { MediaType as FileMediaType } from "../../../repositories/FileRepository.js";
import type { File } from "../../../repositories/models/index.js";

export async function loadStorefrontFile(
  ctx: ServiceContext,
  fileId: string,
  acceptedMediaTypes: readonly FileMediaType[],
): Promise<File> {
  if (!ctx.storefrontStore) {
    throw new PreloadNotFoundError("Storefront media context is unavailable");
  }

  const file = await ctx.loaders.file.load(fileId);
  if (
    !file ||
    !acceptedMediaTypes.includes(file.mediaType as FileMediaType)
  ) {
    throw new PreloadNotFoundError(`Storefront media not found: ${fileId}`);
  }
  return file;
}

export async function resolveDeliveryUrl(
  ctx: ServiceContext,
  file: File,
  transform?: ImageTransformOptions | null,
): Promise<string> {
  const delivery = await new CdnDeliveryService(ctx.kernel.repository).resolve(
    file,
    { transform },
  );
  return delivery.url;
}

export async function resolvePreviewImageId(
  ctx: ServiceContext,
  file: File,
  fallbackToSelf = false,
): Promise<string | null> {
  if (file.previewFileId) {
    const preview = await ctx.loaders.file.load(file.previewFileId);
    if (preview?.mediaType === "IMAGE") return preview.id;
  }
  return fallbackToSelf ? file.id : null;
}

export function resolveSourceFormat(file: File): string {
  if (file.ext) return file.ext.toUpperCase();
  const mimeSubtype = file.mimeType?.split("/")[1]?.split(";")[0];
  return mimeSubtype?.toUpperCase() ?? "UNKNOWN";
}
