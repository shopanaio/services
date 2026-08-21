import type { DiscountAggregate } from "../../repositories/DiscountRepository.js";
import type {
  DiscountUpdateFunctionBindingParams,
  DiscountUpdateFunctionBindingResult,
} from "./dto/index.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { isRecord } from "./shared.js";
import { sectionErrors, sectionSuccess } from "./types.js";

export class DiscountUpdateFunctionBindingScript extends BaseDiscountUpdateScript<DiscountUpdateFunctionBindingParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateFunctionBindingParams,
  ): Promise<DiscountUpdateFunctionBindingResult> {
    const input = params.functionBinding;
    const activationSequence = parseActivationSequence(input.activationSequence);
    const precedence = input.precedence ?? 0;
    if (aggregate.discount.calculationStrategy !== "FUNCTION" || !aggregate.functionBinding) {
      return sectionErrors([
        {
          message: "Only an existing FUNCTION discount binding can be updated",
          code: "FUNCTION_BINDING_NOT_FOUND",
          field: ["functionBinding"],
        },
      ]);
    }
    if (
      activationSequence === null ||
      !Number.isSafeInteger(precedence) ||
      precedence < 0 ||
      !input.functionKey.trim() ||
      !isRecord(input.configurationSnapshot)
    ) {
      return sectionErrors([
        {
          message: "Function binding identifiers, ordering and configuration must be valid",
          code: "INVALID_FUNCTION_BINDING",
          field: ["functionBinding"],
        },
      ]);
    }
    await this.repository.discount.updateFunctionBinding(aggregate.discount.id, {
      installationId: input.installationId,
      functionKey: input.functionKey.trim(),
      precedence,
      activationSequence,
      status: input.status ?? "ACTIVE",
      failureMode: input.failureMode ?? "OPTIONAL",
      configurationSnapshot: input.configurationSnapshot,
    });
    return sectionSuccess();
  }
}

function parseActivationSequence(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(parsed) : null;
}
