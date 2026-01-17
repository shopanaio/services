import { SubgraphReference } from "@shopana/type-resolver";
import { MediaType, Cache } from "./MediaType.js";
import { S3DataResolver } from "./S3DataResolver.js";
import { ExternalDataResolver } from "./ExternalDataResolver.js";
import type { File } from "../../repositories/models/index.js";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";

abstract class FileResolverBase extends MediaType<string, File> {
  protected abstract loadFile(fileId: string): Promise<File | null>;

  async $preload() {
    const file = await this.loadFile(this.$props);

    if (!file) {
      throw new Error(`File not found: ${this.$props}`);
    }

    return file;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.File);
  }

  async url() {
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
}

/**
 * File resolver - resolves File type
 */
@SubgraphReference()
export class FileResolver extends FileResolverBase {
  protected loadFile(fileId: string): Promise<File | null> {
    return this.$ctx.loaders.file.load(fileId);
  }
}

export class FileAnyResolver extends FileResolverBase {
  protected loadFile(fileId: string): Promise<File | null> {
    return this.$ctx.kernel.repository.file.findAnyById(fileId);
  }
}
