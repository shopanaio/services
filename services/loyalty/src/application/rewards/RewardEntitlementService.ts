import type { Repository } from "../../repositories/Repository.js";
import type {
  Account,
  RewardDefinition,
  RewardEntitlement,
} from "../../repositories/models/index.js";
import type { LoyaltyActorType } from "../../contracts/types.js";
import { LoyaltyDomainError } from "../errors.js";
import { addDays } from "../math.js";

export interface IssueRewardInput {
  account: Account;
  definitionId?: string;
  programVersionId?: string;
  definitionCode?: string;
  idempotencyKey: string;
  occurredAt: string;
  actorType: LoyaltyActorType;
  actorId?: string | null;
  sourceEventFactId?: string | null;
  issuanceTransactionId?: string | null;
  monetaryTransactionId?: string | null;
  quantity?: bigint;
  externalReference?: string | null;
}

export type EntitlementTransition =
  | { type: "RESERVE"; checkoutId: string }
  | { type: "RELEASE" }
  | { type: "REDEEM"; orderId: string; externalReference?: string | null }
  | { type: "EXPIRE" }
  | { type: "REVOKE" };

export class RewardEntitlementService {
  constructor(private readonly repository: Repository) {}

  async issue(input: IssueRewardInput): Promise<RewardEntitlement> {
    return this.repository.runInTransaction(async () => {
      if (input.account.status !== "ACTIVE") {
        throw new LoyaltyDomainError(
          "ACCOUNT_NOT_ACTIVE",
          "Rewards can be issued only to an active loyalty account",
        );
      }
      const definition = await this.resolveDefinition(input);
      const version = await this.repository.program.findVersionById(definition.programVersionId);
      if (!version || version.programId !== input.account.programId) {
        throw new LoyaltyDomainError(
          "REWARD_PROGRAM_MISMATCH",
          "Reward definition and loyalty account must belong to the same program",
        );
      }
      const existing = await this.repository.reward.findEntitlementByIdempotency(
        input.account.id,
        definition.id,
        input.idempotencyKey,
      );
      if (existing) {
        const quantity = input.quantity ?? 1n;
        if (
          existing.quantity !== quantity ||
          existing.sourceEventFactId !== (input.sourceEventFactId ?? null) ||
          existing.issuanceTransactionId !== (input.issuanceTransactionId ?? null) ||
          existing.monetaryTransactionId !== (input.monetaryTransactionId ?? null) ||
          existing.externalReference !== (input.externalReference ?? null)
        ) {
          throw new LoyaltyDomainError(
            "REWARD_IDEMPOTENCY_CONFLICT",
            "Reward idempotency key was reused with different issuance data",
          );
        }
        return existing;
      }
      this.assertDefinitionAvailable(definition, input.occurredAt);
      const total = await this.repository.reward.countIssued(definition.id);
      const forAccount = await this.repository.reward.countIssued(definition.id, input.account.id);
      const quantity = input.quantity ?? 1n;
      if (definition.issuanceLimit !== null && total + quantity > definition.issuanceLimit) {
        throw new LoyaltyDomainError(
          "REWARD_ISSUANCE_LIMIT_REACHED",
          "Reward issuance limit was reached",
        );
      }
      if (
        definition.perAccountLimit !== null &&
        forAccount + quantity > definition.perAccountLimit
      ) {
        throw new LoyaltyDomainError(
          "REWARD_ACCOUNT_LIMIT_REACHED",
          "Reward per-account limit was reached",
        );
      }
      const validFrom =
        definition.startsAt && Date.parse(definition.startsAt) > Date.parse(input.occurredAt)
          ? definition.startsAt
          : input.occurredAt;
      const byDays =
        definition.validityDays === null ? null : addDays(validFrom, definition.validityDays);
      const validTo =
        definition.endsAt === null
          ? byDays
          : byDays === null || Date.parse(definition.endsAt) < Date.parse(byDays)
            ? definition.endsAt
            : byDays;
      const entitlement = await this.repository.reward.createEntitlement({
        rewardDefinitionId: definition.id,
        accountId: input.account.id,
        sourceEventFactId: input.sourceEventFactId ?? null,
        issuanceTransactionId: input.issuanceTransactionId ?? null,
        monetaryTransactionId: input.monetaryTransactionId ?? null,
        status: "ISSUED",
        idempotencyKey: input.idempotencyKey,
        configurationSchemaVersion: definition.configurationSchemaVersion,
        configurationSnapshot: definition.configuration,
        quantity,
        validFrom,
        validTo,
        externalReference: input.externalReference ?? null,
        issuedAt: input.occurredAt,
      });
      await this.repository.reward.appendEntitlementEvent({
        entitlementId: entitlement.id,
        eventType: "ISSUED",
        previousStatus: null,
        status: "ISSUED",
        idempotencyKey: input.idempotencyKey,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        reasonCode: "REWARD_ISSUED",
        occurredAt: input.occurredAt,
        metadata: { definitionId: definition.id },
      });
      return entitlement;
    });
  }

  async transition(input: {
    entitlementId: string;

    transition: EntitlementTransition;
    idempotencyKey: string;
    occurredAt: string;
    actorType: LoyaltyActorType;
    actorId?: string | null;
    reasonCode: string;
  }): Promise<RewardEntitlement> {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.reward.lockEntitlementById(input.entitlementId);
      if (!current)
        throw new LoyaltyDomainError("ENTITLEMENT_NOT_FOUND", "Reward entitlement was not found");
      const previousEvent = await this.repository.reward.findEntitlementEventByIdempotency(
        current.id,
        input.idempotencyKey,
      );
      if (previousEvent) {
        if (previousEvent.eventType !== transitionEventType(input.transition)) {
          throw new LoyaltyDomainError(
            "REWARD_IDEMPOTENCY_CONFLICT",
            "Reward transition idempotency key was reused for another transition",
          );
        }
        return current;
      }
      const change = this.transitionChange(current, input.transition, input.occurredAt);
      const updated = await this.repository.reward.updateEntitlementState(
        current.id,
        change.fields,
      );
      if (!updated)
        throw new LoyaltyDomainError(
          "ENTITLEMENT_CONCURRENT_CHANGE",
          "Reward entitlement changed concurrently",
          true,
        );
      await this.repository.reward.appendEntitlementEvent({
        entitlementId: current.id,
        eventType: change.eventType,
        previousStatus: current.status,
        status: updated.status,
        idempotencyKey: input.idempotencyKey,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        reasonCode: input.reasonCode,
        occurredAt: input.occurredAt,
      });
      return updated;
    });
  }

  async expireDue(at: string, limit = 100): Promise<RewardEntitlement[]> {
    return this.repository.runInTransaction(async () => {
      const candidates = await this.repository.reward.listExpirationCandidates(at, limit);
      const expired: RewardEntitlement[] = [];
      for (const current of candidates) {
        const updated = await this.repository.reward.updateEntitlementState(current.id, {
          status: "EXPIRED",
          reservedForCheckoutId: null,
          reservedAt: null,
          expiredAt: at,
        });
        if (!updated) continue;
        await this.repository.reward.appendEntitlementEvent({
          entitlementId: current.id,
          eventType: "EXPIRED",
          previousStatus: current.status,
          status: "EXPIRED",
          idempotencyKey: `expire:${current.id}`,
          actorType: "SYSTEM",
          reasonCode: "REWARD_EXPIRED",
          occurredAt: at,
        });
        expired.push(updated);
      }
      return expired;
    });
  }

  async issueTierBenefits(input: {
    account: Account;
    tierId: string;
    membershipId: string;
    occurredAt: string;
    renewal?: boolean;
  }): Promise<RewardEntitlement[]> {
    const benefits = await this.repository.reward.listTierBenefits(input.tierId);
    const issued: RewardEntitlement[] = [];
    for (const benefit of benefits) {
      const policyType = String(benefit.grantPolicy.type ?? "ON_QUALIFICATION");
      if (policyType !== "ON_QUALIFICATION" && policyType !== "ON_EVERY_QUALIFICATION") continue;
      if (input.renewal && policyType !== "ON_EVERY_QUALIFICATION") continue;
      issued.push(
        await this.issue({
          account: input.account,
          definitionId: benefit.rewardDefinitionId,
          idempotencyKey: `tier:${input.membershipId}:${benefit.id}`,
          occurredAt: input.occurredAt,
          actorType: "SYSTEM",
        }),
      );
    }
    return issued;
  }

  private async resolveDefinition(input: IssueRewardInput): Promise<RewardDefinition> {
    const resolved = input.definitionId
      ? await this.repository.reward.lockDefinitionById(input.definitionId)
      : input.programVersionId && input.definitionCode
        ? await this.repository.reward.findDefinitionByCode(
            input.programVersionId,
            input.definitionCode,
          )
        : null;
    const definition =
      resolved && !input.definitionId
        ? await this.repository.reward.lockDefinitionById(resolved.id)
        : resolved;
    if (!definition)
      throw new LoyaltyDomainError(
        "REWARD_DEFINITION_NOT_FOUND",
        "Reward definition was not found",
      );
    return definition;
  }

  private assertDefinitionAvailable(definition: RewardDefinition, at: string): void {
    const timestamp = Date.parse(at);
    if (
      (definition.startsAt && timestamp < Date.parse(definition.startsAt)) ||
      (definition.endsAt && timestamp >= Date.parse(definition.endsAt))
    ) {
      throw new LoyaltyDomainError(
        "REWARD_DEFINITION_INACTIVE",
        "Reward definition is not active at the requested time",
      );
    }
  }

  private transitionChange(
    current: RewardEntitlement,
    transition: EntitlementTransition,
    at: string,
  ): {
    eventType: "RESERVED" | "RELEASED" | "REDEEMED" | "EXPIRED" | "REVOKED";
    fields: Parameters<Repository["reward"]["updateEntitlementState"]>[1];
  } {
    if (transition.type === "RESERVE") {
      if (current.status !== "ISSUED")
        throw new LoyaltyDomainError(
          "ENTITLEMENT_NOT_AVAILABLE",
          "Only an issued reward can be reserved",
        );
      if (
        Date.parse(current.validFrom) > Date.parse(at) ||
        (current.validTo && Date.parse(current.validTo) <= Date.parse(at))
      ) {
        throw new LoyaltyDomainError(
          "ENTITLEMENT_NOT_AVAILABLE",
          "Reward entitlement is outside its validity window",
        );
      }
      return {
        eventType: "RESERVED",
        fields: {
          status: "RESERVED",
          reservedForCheckoutId: transition.checkoutId,
          reservedAt: at,
        },
      };
    }
    if (transition.type === "RELEASE") {
      if (current.status !== "RESERVED")
        throw new LoyaltyDomainError(
          "ENTITLEMENT_NOT_RESERVED",
          "Reward entitlement is not reserved",
        );
      return {
        eventType: "RELEASED",
        fields: { status: "ISSUED", reservedForCheckoutId: null, reservedAt: null },
      };
    }
    if (transition.type === "REDEEM") {
      if (current.status !== "RESERVED" && current.status !== "ISSUED")
        throw new LoyaltyDomainError(
          "ENTITLEMENT_NOT_AVAILABLE",
          "Reward entitlement cannot be redeemed",
        );
      return {
        eventType: "REDEEMED",
        fields: {
          status: "REDEEMED",
          reservedForCheckoutId: null,
          reservedAt: null,
          redeemedOrderId: transition.orderId,
          redeemedAt: at,
          externalReference: transition.externalReference ?? current.externalReference,
        },
      };
    }
    if (transition.type === "EXPIRE") {
      if (current.status !== "ISSUED" && current.status !== "RESERVED")
        throw new LoyaltyDomainError(
          "ENTITLEMENT_NOT_AVAILABLE",
          "Reward entitlement cannot be expired",
        );
      return {
        eventType: "EXPIRED",
        fields: { status: "EXPIRED", reservedForCheckoutId: null, reservedAt: null, expiredAt: at },
      };
    }
    if (
      current.status === "REDEEMED" ||
      current.status === "EXPIRED" ||
      current.status === "REVOKED"
    ) {
      throw new LoyaltyDomainError(
        "ENTITLEMENT_TERMINAL",
        "Redeemed, expired, or revoked rewards cannot be revoked",
      );
    }
    return {
      eventType: "REVOKED",
      fields: { status: "REVOKED", reservedForCheckoutId: null, reservedAt: null, revokedAt: at },
    };
  }
}

function transitionEventType(
  transition: EntitlementTransition,
): "RESERVED" | "RELEASED" | "REDEEMED" | "EXPIRED" | "REVOKED" {
  if (transition.type === "RESERVE") return "RESERVED";
  if (transition.type === "RELEASE") return "RELEASED";
  if (transition.type === "REDEEM") return "REDEEMED";
  if (transition.type === "EXPIRE") return "EXPIRED";
  return "REVOKED";
}
