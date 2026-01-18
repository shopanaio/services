import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
  ZodSchema,
} from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";
import { AssetGroupCreateScript } from "./scripts/assetGroup/AssetGroupCreateScript.js";
import { AssetGroupDeleteScript } from "./scripts/assetGroup/AssetGroupDeleteScript.js";
import { AssetGroupGetScript } from "./scripts/assetGroup/AssetGroupGetScript.js";
import {
  assetGroupCreateSchema,
  type AssetGroupCreateParams,
  type AssetGroupCreateResult,
} from "./scripts/assetGroup/dto/AssetGroupCreateDto.js";
import {
  assetGroupDeleteSchema,
  type AssetGroupDeleteParams,
  type AssetGroupDeleteResult,
} from "./scripts/assetGroup/dto/AssetGroupDeleteDto.js";
import {
  assetGroupGetSchema,
  type AssetGroupGetParams,
  type AssetGroupGetResult,
} from "./scripts/assetGroup/dto/AssetGroupGetDto.js";
import { FileLinkScript } from "./scripts/backRef/FileLinkScript.js";
import { FileUnlinkScript } from "./scripts/backRef/FileUnlinkScript.js";
import { FileLinkManyScript } from "./scripts/backRef/FileLinkManyScript.js";
import { FileUnlinkManyScript } from "./scripts/backRef/FileUnlinkManyScript.js";
import { EntityDeletedScript } from "./scripts/backRef/EntityDeletedScript.js";
import { SyncEntityFilesScript } from "./scripts/backRef/SyncEntityFilesScript.js";
import {
  fileLinkSchema,
  fileUnlinkSchema,
  fileLinkManySchema,
  fileUnlinkManySchema,
  entityDeletedSchema,
  syncEntityFilesSchema,
  type FileLinkParams,
  type FileLinkResult,
  type FileUnlinkParams,
  type FileUnlinkResult,
  type FileLinkManyParams,
  type FileLinkManyResult,
  type FileUnlinkManyParams,
  type FileUnlinkManyResult,
  type EntityDeletedParams,
  type EntityDeletedResult,
  type SyncEntityFilesParams,
  type SyncEntityFilesResult,
} from "./scripts/backRef/dto/index.js";

/**
 * Media broker actions registered with @Action decorator.
 * Each method decorated with @Action is automatically registered
 * as a broker action when the module initializes.
 */
@Injectable()
export class MediaBrokerActions extends BrokerActions {
  constructor(@InjectBroker("media") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  /**
   * Action: createAssetGroup - creates a media asset group for an owner entity
   */
  @Action("createAssetGroup")
  @ZodSchema(assetGroupCreateSchema)
  async createAssetGroup(
    params: AssetGroupCreateParams
  ): Promise<AssetGroupCreateResult> {
    return this.kernel.runScript(AssetGroupCreateScript, params);
  }

  /**
   * Action: deleteAssetGroup - deletes a media asset group and all its files
   */
  @Action("deleteAssetGroup")
  @ZodSchema(assetGroupDeleteSchema)
  async deleteAssetGroup(
    params: AssetGroupDeleteParams
  ): Promise<AssetGroupDeleteResult> {
    return this.kernel.runScript(AssetGroupDeleteScript, params);
  }

  /**
   * Action: getAssetGroup - gets a media asset group by owner
   */
  @Action("getAssetGroup")
  @ZodSchema(assetGroupGetSchema)
  async getAssetGroup(
    params: AssetGroupGetParams
  ): Promise<AssetGroupGetResult> {
    return this.kernel.runScript(AssetGroupGetScript, params);
  }

  /**
   * Action: fileLink - link file to entity
   */
  @Action("fileLink")
  @ZodSchema(fileLinkSchema)
  async fileLink(params: FileLinkParams): Promise<FileLinkResult> {
    return this.kernel.runScript(FileLinkScript, params);
  }

  /**
   * Action: fileUnlink - unlink file from entity
   */
  @Action("fileUnlink")
  @ZodSchema(fileUnlinkSchema)
  async fileUnlink(params: FileUnlinkParams): Promise<FileUnlinkResult> {
    return this.kernel.runScript(FileUnlinkScript, params);
  }

  /**
   * Action: fileLinkMany - batch link files to entity
   */
  @Action("fileLinkMany")
  @ZodSchema(fileLinkManySchema)
  async fileLinkMany(
    params: FileLinkManyParams
  ): Promise<FileLinkManyResult> {
    return this.kernel.runScript(FileLinkManyScript, params);
  }

  /**
   * Action: fileUnlinkMany - batch unlink files from entity
   */
  @Action("fileUnlinkMany")
  @ZodSchema(fileUnlinkManySchema)
  async fileUnlinkMany(
    params: FileUnlinkManyParams
  ): Promise<FileUnlinkManyResult> {
    return this.kernel.runScript(FileUnlinkManyScript, params);
  }

  /**
   * Action: entityDeleted - unlink all files from entity
   */
  @Action("entityDeleted")
  @ZodSchema(entityDeletedSchema)
  async entityDeleted(
    params: EntityDeletedParams
  ): Promise<EntityDeletedResult> {
    return this.kernel.runScript(EntityDeletedScript, params);
  }

  /**
   * Action: syncEntityFiles - atomic reset + relink operation.
   * Clears all existing back-refs for entity and links the provided files.
   */
  @Action("syncEntityFiles")
  @ZodSchema(syncEntityFilesSchema)
  async syncEntityFiles(
    params: SyncEntityFilesParams
  ): Promise<SyncEntityFilesResult> {
    return this.kernel.runScript(SyncEntityFilesScript, params);
  }
}
