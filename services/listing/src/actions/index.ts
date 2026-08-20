import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import {
  COLLECTION_LISTING_CONTRACT_VERSION,
  hashCanonicalCollectionRulesV1,
  ListingCollectionActionNames,
  normalizeCanonicalCollectionRulesV1,
  type PreviewCollectionRulesParams,
  type PreviewCollectionRulesResult,
} from "@shopana/broker-types";
import { timingSafeEqual } from "node:crypto";
import { Kernel } from "../kernel/Kernel.js";
import { ListingPreviewCollectionScript } from "../scripts/ListingPreviewCollectionScript.js";

interface PreviewStoreContextResult {
  store: {
    id: string;
    organizationId: string;
    defaultLocale: string;
    currencyCode: string;
    locales: readonly string[];
  } | null;
  userErrors: Array<{ message: string }>;
}

@Injectable()
export class ListingBrokerActions extends BrokerActions {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Action(ListingCollectionActionNames.previewRules, {
    timeoutMs: 5_000,
    readOnly: true,
  })
  async previewCollectionRules(
    params: PreviewCollectionRulesParams,
    ctx: BrokerCallContext,
  ): Promise<PreviewCollectionRulesResult> {
    if (ctx.caller.kind !== "action" || ctx.caller.service !== "catalog") {
      return {
        ok: false,
        code: "INVALID_COLLECTION_RULES",
        message: "Collection preview is not available to this caller",
        retryable: false,
      };
    }
    if (!params.storeId) {
      return {
        ok: false,
        code: "INVALID_COLLECTION_RULES",
        message: "Collection preview parameters are invalid",
        retryable: false,
      };
    }
    if (params.contractVersion !== COLLECTION_LISTING_CONTRACT_VERSION) {
      return {
        ok: false,
        code: "UNSUPPORTED_COLLECTION_PREVIEW_VERSION",
        message: "Collection preview contract version is not supported",
        retryable: false,
      };
    }
    let rules;
    try {
      rules = normalizeCanonicalCollectionRulesV1(params.rules);
    } catch (error) {
      return {
        ok: false,
        code: "INVALID_COLLECTION_RULES",
        message: error instanceof Error ? error.message : "Collection rules are invalid",
        retryable: false,
        field: ["rules"],
      };
    }
    const expectedHash = hashCanonicalCollectionRulesV1(rules);
    if (typeof params.rulesHash !== "string" || !safeHashEquals(expectedHash, params.rulesHash)) {
      return {
        ok: false,
        code: "COLLECTION_RULE_HASH_MISMATCH",
        message: "Collection rule hash does not match the canonical rules",
        retryable: false,
        field: ["rulesHash"],
      };
    }
    const callerStoreId = ctx.adminContext?.store?.id ?? ctx.app?.storeId;
    if (callerStoreId && callerStoreId !== params.storeId) {
      return {
        ok: false,
        code: "COLLECTION_PREVIEW_UNAVAILABLE",
        message: "Collection preview organization context is missing",
        retryable: false,
      };
    }
    let storeResult: PreviewStoreContextResult;
    try {
      storeResult = await this.broker.call<PreviewStoreContextResult, { id: string }>(
        "project.getStoreById",
        { id: params.storeId },
      );
    } catch {
      return {
        ok: false,
        code: "COLLECTION_PREVIEW_UNAVAILABLE",
        message: "Collection preview store context is unavailable",
        retryable: true,
      };
    }
    if (!storeResult.store || storeResult.store.id !== params.storeId) {
      return {
        ok: false,
        code: "INVALID_COLLECTION_RULES",
        message: "Collection preview store was not found",
        retryable: false,
      };
    }
    const store = storeResult.store;
    return Kernel.getInstance().runScript(
      ListingPreviewCollectionScript,
      { rules, rulesHash: expectedHash },
      {
        storeId: params.storeId,
        organizationId: store.organizationId,
        requestId: ctx.app?.correlationId,
        locale: store.defaultLocale,
        defaultLocale: store.defaultLocale,
        defaultCurrency: store.currencyCode,
        locales: [...store.locales],
        currencies: [store.currencyCode],
      },
    );
  }
}

function safeHashEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}
