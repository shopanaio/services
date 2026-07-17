import type { UserError } from "../../kernel/BaseScript.js";
import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateChannelsParams,
  DiscountUpdateChannelsResult,
} from "./dto/index.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateChannelsScript extends BaseDiscountUpdateScript<DiscountUpdateChannelsParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateChannelsParams,
  ): Promise<DiscountUpdateChannelsResult> {
    const errors: UserError[] = [];
    const seen = new Set<string>();
    const channels = params.channels.map((input, index) => {
      const code = input.code.trim();
      if (!/^[A-Z][A-Z0-9_:-]{1,63}$/.test(code)) {
        errors.push({
          message: "Channel code has an invalid format",
          code: "INVALID_CHANNEL_CODE",
          field: [String(index), "code"],
        });
      }
      if (seen.has(code)) {
        errors.push({
          message: "A channel may only be supplied once",
          code: "DUPLICATE_CHANNEL",
          field: [String(index), "code"],
        });
      }
      seen.add(code);
      return { code, featured: input.featured ?? false };
    });
    if (errors.length > 0) return sectionErrors(errors);
    await this.repository.discount.replaceChannels(
      aggregate.discount.id,
      channels,
    );
    return sectionSuccess();
  }
}
