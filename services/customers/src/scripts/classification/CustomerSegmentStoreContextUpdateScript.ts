import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CustomerSegmentStoreContext } from "../../repositories/models/index.js";
import type { SegmentDefinitionV1 } from "@shopana/customer-segment-dsl";
import { validateCustomerSegmentQuery } from "../../segments/service.js";

export interface CustomerSegmentStoreContextUpdateParams {
  readonly storeId: string;
  readonly currencyCode: string;
  readonly currencyExponent: number;
  readonly timeZone: string;
  readonly configurationRevision: number;
  readonly occurredAt: string;
}

export interface CustomerSegmentStoreContextUpdateResult {
  readonly context: CustomerSegmentStoreContext;
  readonly applied: boolean;
  readonly timeZoneChanged: boolean;
  readonly currencyChanged: boolean;
}

export class CustomerSegmentStoreContextUpdateScript extends BaseScript<
  CustomerSegmentStoreContextUpdateParams,
  CustomerSegmentStoreContextUpdateResult
> {
  @Transactional()
  protected execute(
    params: CustomerSegmentStoreContextUpdateParams,
  ): Promise<CustomerSegmentStoreContextUpdateResult> {
    validate(params);
    if (params.storeId !== this.context.store.id) {
      throw new Error("Store context projection cannot cross tenant boundary");
    }
    return this.apply(params);
  }

  protected handleError(error: unknown): CustomerSegmentStoreContextUpdateResult {
    throw error;
  }

  private async apply(
    params: CustomerSegmentStoreContextUpdateParams,
  ): Promise<CustomerSegmentStoreContextUpdateResult> {
    const result = await this.repository.segmentStoreContext.apply(params);
    if (result.currencyChanged) {
      await this.repository.segmentMaterialization.failCurrencyDependentSegments();
      return result;
    }
    if (!result.timeZoneChanged) return result;
    const storeContext = {
      storeId: result.context.storeId,
      currencyCode: result.context.currencyCode,
      currencyExponent: result.context.currencyExponent,
      timeZone: result.context.timeZone,
      configurationRevision: result.context.configurationRevision,
    };
    for (const segment of await this.repository.segment.listDynamic()) {
      const definition = segment.definition as unknown as SegmentDefinitionV1;
      if (!definition.contextDependencies?.includes("timezone")) continue;
      if (!segment.query) {
        throw new Error(`Dynamic segment ${segment.id} has no canonical query`);
      }
      const validation = await validateCustomerSegmentQuery(
        this.repository,
        segment.query,
        storeContext,
        params.occurredAt,
      );
      if (!validation.valid || !validation.definition || !validation.canonicalQuery) {
        await this.repository.segmentMaterialization.failSegment(segment.id);
        continue;
      }
      const updated = await this.repository.segment.update(
        segment.id,
        {
          query: validation.canonicalQuery,
          definition: validation.definition as unknown as Record<string, unknown>,
        },
        segment.revision,
        true,
        true,
        false,
      );
      if (!updated) throw new Error(`Concurrent dynamic segment update ${segment.id}`);
      await this.repository.segmentMaterialization.schedule(updated, params.occurredAt);
    }
    return result;
  }
}

function validate(params: CustomerSegmentStoreContextUpdateParams): void {
  if (!/^[A-Z]{3}$/u.test(params.currencyCode)) {
    throw new Error("Store segment currencyCode is invalid");
  }
  if (
    !Number.isSafeInteger(params.currencyExponent) ||
    params.currencyExponent < 0 ||
    params.currencyExponent > 6 ||
    !Number.isSafeInteger(params.configurationRevision) ||
    params.configurationRevision < 0
  ) {
    throw new Error("Store segment numeric context is invalid");
  }
  const occurredAt = new Date(params.occurredAt);
  if (
    Number.isNaN(occurredAt.valueOf()) ||
    occurredAt.toISOString() !== params.occurredAt
  ) {
    throw new Error("Store segment occurredAt must be a canonical instant");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: params.timeZone }).format(0);
  } catch {
    throw new Error("Store segment timeZone is invalid");
  }
}
