import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { FileConnectionResolver } from "./connection/index.js";
import type { FileRelayInput } from "../../repositories/FileRepository.js";
import {
  decodeGlobalId,
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { TypePolicy } from "@shopana/type-resolver";
import { CdnConfigurationResolver } from "./CdnConfigurationResolver.js";
import { CdnRoutingRuleResolver } from "./CdnRoutingRuleResolver.js";
import { MediaSettingsResolver } from "./MediaSettingsResolver.js";
import { CdnDeliveryPreviewResolver } from "./CdnDeliveryPreviewResolver.js";
import {
  CdnDeliveryService,
  type ImageTransformOptions,
} from "../../infrastructure/cdn/index.js";

/**
 * MediaQuery namespace resolver.
 * Handles all media query operations.
 * Store context is determined from x-store-name header.
 */
@TypePolicy<MediaQueryResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class MediaQueryResolver extends MediaType<Record<string, never>> {
  async mediaSettings() {
    const assetGroup = await this.$ctx.kernel.repository.assetGroup.findByOwner(
      "store",
      this.$ctx.store.id
    );
    return assetGroup
      ? new MediaSettingsResolver(assetGroup.id, this.$ctx)
      : null;
  }

  async cdnDeliveryPreview({
    fileId,
    configurationId,
    country,
    transform,
  }: {
    fileId: string;
    configurationId?: string | null;
    country?: string | null;
    transform?: ImageTransformOptions | null;
  }) {
    let decodedFileId: string;
    let decodedConfigurationId: string | null = null;
    try {
      decodedFileId = decodeGlobalIdByType(fileId, GlobalIdEntity.File);
      decodedConfigurationId = configurationId
        ? decodeGlobalIdByType(
            configurationId,
            GlobalIdEntity.CdnConfiguration
          )
        : null;
    } catch {
      return new CdnDeliveryPreviewResolver(
        {
          url: "",
          originUrl: "",
          configuration: null,
          routingRule: null,
          fallback: true,
          userErrors: [
            { code: "INVALID_ID", message: "Invalid file or CDN configuration ID" },
          ],
        },
        this.$ctx
      );
    }

    const file = await this.$ctx.kernel.repository.file.findByOwner(
      decodedFileId,
      "store",
      this.$ctx.store.id
    );
    if (!file) {
      return new CdnDeliveryPreviewResolver(
        {
          url: "",
          originUrl: "",
          configuration: null,
          routingRule: null,
          fallback: true,
          userErrors: [
            { field: ["fileId"], code: "NOT_FOUND", message: "File not found" },
          ],
        },
        this.$ctx
      );
    }

    const result = await new CdnDeliveryService(
      this.$ctx.kernel.repository
    ).resolve(file, {
      configurationId: decodedConfigurationId,
      country,
      transform,
    });
    return new CdnDeliveryPreviewResolver(result, this.$ctx);
  }

  /**
   * Get a node by its global ID (Relay Node interface)
   */
  async node({ id }: { id: string }) {
    try {
      const decoded = decodeGlobalId(id);
      if (decoded.typeName === GlobalIdEntity.File) {
        return (await this.$ctx.loaders.file.load(decoded.id))
          ? new FileResolver(decoded.id, this.$ctx)
          : null;
      }
      const assetGroup =
        await this.$ctx.kernel.repository.assetGroup.findByOwner(
          "store",
          this.$ctx.store.id
        );
      if (!assetGroup) return null;
      if (decoded.typeName === GlobalIdEntity.CdnConfiguration) {
        return (await this.$ctx.kernel.repository.cdnConfiguration.findById(
          assetGroup.id,
          decoded.id
        ))
          ? new CdnConfigurationResolver(decoded.id, this.$ctx)
          : null;
      }
      if (decoded.typeName === GlobalIdEntity.CdnRoutingRule) {
        return (await this.$ctx.kernel.repository.cdnRoutingRule.findById(
          assetGroup.id,
          decoded.id
        ))
          ? new CdnRoutingRuleResolver(decoded.id, this.$ctx)
          : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get multiple nodes by their global IDs (Relay Node interface)
   */
  nodes({ ids }: { ids: string[] }) {
    return Promise.all(ids.map((id) => this.node({ id })));
  }

  /**
   * Get a single file by ID
   */
  async file({ id }: { id: string }) {
    // Decode fileId (File GID) to fileId
    let fileId: string;
    try {
      fileId = decodeGlobalIdByType(id, GlobalIdEntity.File);
    } catch {
      return null;
    }

    return (await this.$ctx.loaders.file.load(fileId))
      ? new FileResolver(fileId, this.$ctx)
      : null;
  }

  /**
   * Get files with Relay-style pagination.
   * Uses store.id from context as ownerId.
   */
  files(args: Omit<FileRelayInput, "ownerId">) {
    // Get store ID from context (determined by x-store-name header)
    const ownerId = this.$ctx.store.id;

    return new FileConnectionResolver(
      {
        ...args,
        ownerId,
      },
      this.$ctx
    );
  }
}
