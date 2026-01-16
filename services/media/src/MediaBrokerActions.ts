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
}
