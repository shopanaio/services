import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateMetadataParams,
  DiscountUpdateMetadataResult,
} from "./dto/index.js";
import { isRecord } from "./shared.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateMetadataScript extends BaseDiscountUpdateScript<DiscountUpdateMetadataParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateMetadataParams,
  ): Promise<DiscountUpdateMetadataResult> {
    if (!isRecord(params.metadata)) {
      return sectionErrors([
        {
          message: "Metadata must be a JSON object",
          code: "INVALID_METADATA",
          field: ["metadata"],
        },
      ]);
    }
    await this.repository.discount.updateRoot(aggregate.discount.id, {
      metadata: params.metadata,
    });
    return sectionSuccess();
  }
}
