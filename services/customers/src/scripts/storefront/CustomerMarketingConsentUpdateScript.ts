import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { Customer, CustomerConsent } from "../../repositories/models/index.js";
import {
  failedCustomerMutation,
  internalStorefrontError,
  customerAvailabilityError,
  storefrontError,
  type StorefrontCustomerMutationResult,
} from "./types.js";

export type StorefrontMarketingConsentChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";
export type StorefrontMarketingConsentTargetState = "SUBSCRIBED" | "UNSUBSCRIBED";

export interface StorefrontCustomerMarketingConsentUpdateParams {
  customerId: string;
  channel: StorefrontMarketingConsentChannel;
  state: StorefrontMarketingConsentTargetState;

  idempotencyKey: string;
  requestId: string;
}

export interface StorefrontCustomerMarketingConsentUpdateResult extends StorefrontCustomerMutationResult {
  marketingConsent: { id: string } | null;
}

export class StorefrontCustomerMarketingConsentUpdateScript extends BaseScript<
  StorefrontCustomerMarketingConsentUpdateParams,
  StorefrontCustomerMarketingConsentUpdateResult
> {
  @Transactional()
  protected async execute(
    params: StorefrontCustomerMarketingConsentUpdateParams,
  ): Promise<StorefrontCustomerMarketingConsentUpdateResult> {
    if (!isChannel(params.channel)) {
      return failed(storefrontError("INVALID_CHANNEL", "Unknown marketing channel", ["channel"]));
    }
    if (!isTargetState(params.state)) {
      return failed(storefrontError("INVALID_STATE", "Unknown marketing consent state", ["state"]));
    }

    const customer = await this.repository.customer.findById(params.customerId);
    if (!customer || customer.lifecycleStatus !== "ACTIVE") {
      return failed(
        storefrontError("CUSTOMER_UNAVAILABLE", "Customer is not available for storefront writes"),
      );
    }
    const current = await this.repository.consent.findByCustomerAndChannel(
      params.customerId,
      params.channel,
    );
    const contactPoint = resolveContactPoint(customer, current, params.channel);
    if (!contactPoint) {
      return failed(
        storefrontError(
          "CONTACT_POINT_UNAVAILABLE",
          "This marketing channel has no contact point",
          ["channel"],
        ),
      );
    }

    const revisionUpdate = await this.repository.customer.bumpActiveRevision(params.customerId);
    if (revisionUpdate.status !== "updated") {
      return failed(customerAvailabilityError(revisionUpdate));
    }

    const result = await this.repository.consent.set({
      customerId: params.customerId,
      channel: params.channel,
      state: params.state,
      optInLevel:
        params.state === "SUBSCRIBED" ? "SINGLE_OPT_IN" : (current?.optInLevel ?? "UNKNOWN"),
      contactPoint,
      source: "storefront",
      actorType: "customer",
      actorId: params.customerId,
      requestId: params.requestId,
      idempotencyKey: `storefront:${params.customerId}:${params.idempotencyKey}`,
      evidence: {
        channel: params.channel,
        targetState: params.state,
      },
    });
    await this.invalidateDynamicSegments(params.customerId, ["consent"], "storefrontConsent");

    return {
      marketingConsent: { id: result.consent.id },
      customer: {
        id: revisionUpdate.customer.id,
        revision: revisionUpdate.customer.revision,
      },
      updatedReasons: ["consent"],
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StorefrontCustomerMarketingConsentUpdateResult {
    return failed(internalStorefrontError());
  }
}

function resolveContactPoint(
  customer: Customer,
  current: CustomerConsent | null,
  channel: StorefrontMarketingConsentChannel,
): string | null {
  switch (channel) {
    case "EMAIL":
      return customer.email?.trim() || current?.contactPoint || null;
    case "SMS":
    case "WHATSAPP":
      return customer.phoneE164?.trim() || current?.contactPoint || null;
    case "PUSH":
      return current?.contactPoint || null;
  }
}

function isChannel(value: string): value is StorefrontMarketingConsentChannel {
  return ["EMAIL", "SMS", "WHATSAPP", "PUSH"].includes(value);
}

function isTargetState(value: string): value is StorefrontMarketingConsentTargetState {
  return ["SUBSCRIBED", "UNSUBSCRIBED"].includes(value);
}

function failed(
  ...userErrors: ReturnType<typeof storefrontError>[]
): StorefrontCustomerMarketingConsentUpdateResult {
  return {
    marketingConsent: null,
    ...failedCustomerMutation(...userErrors),
  };
}
