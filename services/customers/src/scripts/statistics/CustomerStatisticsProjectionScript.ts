import { BaseScript, Transactional } from "../../kernel/BaseScript.js";

export type CustomerStatisticsProjectionParams =
  | Readonly<{
      operation: "ORDER";
      customerId: string;
      orderId: string;
      revision: number;
      status: "OPEN" | "COMPLETED" | "CANCELLED";
      currencyCode: string;
      totalAmountMinor: string;
      createdAt: string;
      completedAt?: string | null;
      cancelledAt?: string | null;
      occurredAt: string;
    }>
  | Readonly<{
      operation: "CHECKOUT";
      customerId: string;
      checkoutId: string;
      version: number;
      occurredAt: string;
    }>
  | Readonly<{
      operation: "REFUND";
      customerId: string;
      refundId: string;
      orderId: string;
      revision: number;
      currencyCode: string;
      amountMinor: string;
      occurredAt: string;
    }>;

export interface CustomerStatisticsProjectionResult {
  readonly customerId: string;
  readonly changed: boolean;
  readonly updatedAt: string;
}

export class CustomerStatisticsProjectionScript extends BaseScript<
  CustomerStatisticsProjectionParams,
  CustomerStatisticsProjectionResult
> {
  @Transactional()
  protected async execute(
    params: CustomerStatisticsProjectionParams,
  ): Promise<CustomerStatisticsProjectionResult> {
    let changed: boolean;
    if (params.operation === "ORDER") {
      requireRevision(params.revision, "revision");
      changed = await this.repository.statistics.projectOrder({
        orderId: params.orderId,
        customerId: params.customerId,
        revision: params.revision,
        status: params.status,
        currencyCode: normalizeCurrency(params.currencyCode),
        totalAmountMinor: parseMinor(params.totalAmountMinor),
        createdAt: requireDate(params.createdAt, "createdAt"),
        completedAt: optionalDate(params.completedAt, "completedAt"),
        cancelledAt: optionalDate(params.cancelledAt, "cancelledAt"),
        updatedAt: requireDate(params.occurredAt, "occurredAt"),
      });
    } else if (params.operation === "CHECKOUT") {
      requireRevision(params.version, "version");
      changed = await this.repository.statistics.projectCheckout({
        checkoutId: params.checkoutId,
        customerId: params.customerId,
        version: params.version,
        occurredAt: requireDate(params.occurredAt, "occurredAt"),
      });
    } else {
      requireRevision(params.revision, "revision");
      changed = await this.repository.statistics.projectRefund({
        refundId: params.refundId,
        customerId: params.customerId,
        orderId: params.orderId,
        revision: params.revision,
        currencyCode: normalizeCurrency(params.currencyCode),
        amountMinor: parseMinor(params.amountMinor),
        refundedAt: requireDate(params.occurredAt, "occurredAt"),
      });
    }
    if (changed) {
      await this.repository.statistics.rebuildForCustomer(params.customerId);
    }
    return {
      customerId: params.customerId,
      changed,
      updatedAt: params.occurredAt,
    };
  }

  protected handleError(error: unknown): CustomerStatisticsProjectionResult {
    throw error;
  }
}

function parseMinor(value: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error("Projection money must be a non-negative minor-unit integer");
  }
  return BigInt(value);
}

function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/u.test(currency)) {
    throw new Error("Projection currencyCode must be an ISO-style three-letter code");
  }
  return currency;
}

function requireDate(value: string, field: string): string {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`Projection ${field} must be an ISO date-time`);
  }
  return value;
}

function optionalDate(
  value: string | null | undefined,
  field: string,
): string | null {
  return value == null ? null : requireDate(value, field);
}

function requireRevision(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Projection ${field} must be a non-negative safe integer`);
  }
  return value;
}
