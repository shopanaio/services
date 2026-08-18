import {
  PreloadNotFoundError,
  SubgraphReference,
  TypePolicy,
} from "@shopana/type-resolver";
import { MediaType } from "./MediaType.js";
import { S3DataResolver } from "./S3DataResolver.js";
import { ExternalDataResolver } from "./ExternalDataResolver.js";
import type {
  File,
  MediaSource,
} from "../../repositories/models/index.js";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CdnDeliveryService, type ImageTransformOptions } from "../../infrastructure/cdn/index.js";

abstract class FileResolverBase extends MediaType<string, File> {
  protected abstract loadFile(fileId: string): Promise<File | null>;

  async $preload() {
    const file = await this.loadFile(this.$props);

    if (!file) {
      throw new PreloadNotFoundError(`File not found: ${this.$props}`);
    }

    return file;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.File);
  }

  async url(args?: {
    transform?: ImageTransformOptions | null;
    country?: string | null;
  }) {
    const file = await this.loadFile(this.$props);
    if (!file) throw new PreloadNotFoundError(`File not found: ${this.$props}`);
    const delivery = await new CdnDeliveryService(
      this.$ctx.kernel.repository
    ).resolve(file, args);
    return delivery.url;
  }

  async originUrl() {
    return this.$get("url");
  }

  async mimeType() {
    return this.$get("mimeType");
  }

  async ext() {
    return this.$get("ext");
  }

  async sizeBytes() {
    const size = await this.$get("sizeBytes");
    return size?.toString() ?? null;
  }

  async originalName() {
    return this.$get("originalName");
  }

  async width() {
    return this.$get("width");
  }

  async height() {
    return this.$get("height");
  }

  async dimensions() {
    const width = await this.$get("width");
    const height = await this.$get("height");
    if (width && height) {
      return { width, height };
    }
    return null;
  }

  async durationMs() {
    return this.$get("durationMs");
  }

  async altText() {
    return this.$get("altText");
  }

  async mediaType() {
    return this.$get("mediaType");
  }

  async previewFile() {
    const previewFileId = await this.$get("previewFileId");
    if (!previewFileId) return null;
    const preview = await this.$ctx.kernel.repository.file.findAccessibleById(
      previewFileId,
      {
        storeId: this.$ctx.store.id,
        organizationId: this.$ctx.store.organizationId,
        userId: this.$ctx.user.id,
      }
    );
    return preview ? new FileResolver(preview.id, this.$ctx) : null;
  }

  async thumbhash() {
    return this.$get("thumbhash");
  }

  async processingStatus() {
    return this.$get("processingStatus");
  }

  async processingError() {
    return this.$get("processingError");
  }

  async processedAt() {
    return this.$get("processedAt");
  }

  async sources() {
    const sources = await this.$ctx.kernel.repository.mediaSource.getByMediaFileId(
      this.$props
    );
    return sources.map((source) => new MediaSourceResolver(source, this.$ctx));
  }

  async sourceUrl() {
    return this.$get("sourceUrl");
  }

  async provider() {
    return this.$get("provider");
  }

  async isProcessed() {
    return this.$get("isProcessed");
  }

  async meta() {
    return this.$get("meta");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async deletedAt() {
    return this.$get("deletedAt");
  }

  async deletionState() {
    const state = await this.$ctx.kernel.repository.fileDeletionState.findByFileId(
      this.$props
    );
    return state?.deletionState ?? "ACTIVE";
  }

  async deletionErrorCode() {
    const state = await this.$ctx.kernel.repository.fileDeletionState.findByFileId(
      this.$props
    );
    return state?.deletionErrorCode ?? null;
  }

  async lastDeletionError() {
    const state = await this.$ctx.kernel.repository.fileDeletionState.findByFileId(
      this.$props
    );
    return state?.lastDeletionError ?? null;
  }

  async failedAt() {
    const state = await this.$ctx.kernel.repository.fileDeletionState.findByFileId(
      this.$props
    );
    return state?.failedAt ? new Date(state.failedAt) : null;
  }

  /**
   * Resolve S3 data for S3 provider files
   */
  async s3Data() {
    const provider = await this.$get("provider");
    if (provider !== "S3") {
      return null;
    }
    return new S3DataResolver(this.$props, this.$ctx);
  }

  /**
   * Resolve external media data for YouTube/Vimeo/URL providers
   */
  async externalData() {
    const provider = await this.$get("provider");
    if (!["YOUTUBE", "VIMEO", "URL"].includes(provider ?? "")) {
      return null;
    }
    return new ExternalDataResolver(this.$props, this.$ctx);
  }

  async usage() {
    const deletedAt = await this.$get("deletedAt");
    if (deletedAt) {
      return { totalCount: 0, byEntity: [], fileActive: false };
    }

    const usage = await this.$ctx.loaders.fileUsage.load(this.$props);
    return { ...usage, fileActive: true };
  }
}

/**
 * File resolver - resolves File type
 */
@SubgraphReference()
@TypePolicy<FileResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class FileResolver extends FileResolverBase {
  protected loadFile(fileId: string): Promise<File | null> {
    return this.$ctx.loaders.file.load(fileId);
  }
}

@TypePolicy<MediaSourceResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class MediaSourceResolver extends MediaType<MediaSource, MediaSource> {
  async $preload() {
    return this.$props;
  }

  sourceFile() {
    return new FileResolver(this.$props.sourceFileId, this.$ctx);
  }

  async kind() { return this.$get("kind"); }
  async format() { return this.$get("format"); }
  async sortOrder() { return this.$get("sortOrder"); }
  async createdAt() { return this.$get("createdAt"); }
}

export class FileAnyResolver extends FileResolverBase {
  protected loadFile(fileId: string): Promise<File | null> {
    return this.$ctx.kernel.repository.file.findAccessibleById(
      fileId,
      {
        storeId: this.$ctx.store.id,
        organizationId: this.$ctx.store.organizationId,
        userId: this.$ctx.user.id,
      },
      true
    );
  }
}
