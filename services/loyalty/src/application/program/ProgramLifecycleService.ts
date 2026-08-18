import type { Repository } from "../../repositories/Repository.js";
import type {
  NewProgram,
  NewProgramVersion,
  NewEarningRule,
  NewRewardDefinition,
  NewTier,
  NewTierPolicy,
  Program,
  ProgramVersion,
} from "../../repositories/models/index.js";
import {
  createLoyaltyProgramRulesV1,
  type LoyaltyProgramRulesValidationInputV1,
} from "../../contracts/policy.js";
import { LoyaltyDomainError } from "../errors.js";
import {
  validateEarningRulePolicy,
  validateRewardConfiguration,
  validateTierMetricSchemaVersion,
  validateTierPolicyExpression,
  validateTierRewardGrantPolicy,
} from "./policySchemas.js";

export interface LoyaltyReferenceValidationRequest {
  storeId: string;
  rules: Readonly<Record<string, unknown>>;
  rewardDefinitions?: readonly Readonly<{
    rewardType: NewRewardDefinition["rewardType"];
    configuration: unknown;
  }>[];
  earningRules?: readonly Readonly<{ conditions: unknown }>[];
}

export interface LoyaltyReferenceValidator {
  validate(input: LoyaltyReferenceValidationRequest): Promise<readonly { field: readonly (string | number)[]; message: string }[]>;
}

type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
type EarningRuleDraftInput = RequiredFields<
  Omit<NewEarningRule, "id" | "storeId" | "programVersionId" | "createdAt">,
  | "triggerConfig"
  | "conditions"
  | "action"
  | "limits"
  | "triggerSchemaVersion"
  | "conditionSchemaVersion"
  | "actionSchemaVersion"
  | "limitSchemaVersion"
>;
type RewardDefinitionDraftInput = RequiredFields<
  Omit<NewRewardDefinition, "id" | "storeId" | "programVersionId" | "createdAt">,
  "configurationSchemaVersion"
>;
type TierPolicyDraftInput = RequiredFields<
  Omit<NewTierPolicy, "id" | "storeId" | "programVersionId" | "createdAt">,
  "metricSchemaVersion"
>;

export type ProgramVersionDraftInput = Omit<
  NewProgramVersion,
  | "id"
  | "storeId"
  | "programId"
  | "version"
  | "status"
  | "revision"
  | "rulesSchemaVersion"
  | "rules"
  | "publishedById"
  | "publishedAt"
  | "createdAt"
> & { rules: LoyaltyProgramRulesValidationInputV1 };

export interface ProgramVersionConfigurationInput {
  expectedProgramRevision?: number;
  earningRules?: readonly EarningRuleDraftInput[];
  rewardDefinitions?: readonly RewardDefinitionDraftInput[];
  tierPolicy?: TierPolicyDraftInput | null;
  tiers?: readonly Omit<NewTier, "id" | "storeId" | "programVersionId" | "createdAt">[];
}

export class ProgramLifecycleService {
  constructor(
    private readonly repository: Repository,
    private readonly references?: LoyaltyReferenceValidator,
  ) {}

  async createProgram(
    input: Omit<NewProgram, "id" | "storeId" | "revision" | "createdAt" | "updatedAt">,
  ): Promise<Program> {
    return this.repository.runInTransaction(async () => {
      if (input.isDefault) await this.repository.program.clearDefault();
      return this.repository.program.create(input);
    });
  }

  async updateProgram(
    id: string,
    input: Parameters<Repository["program"]["update"]>[1],
    expectedRevision?: number,
  ): Promise<Program> {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.program.lockById(id);
      if (!current) throw new LoyaltyDomainError("PROGRAM_NOT_FOUND", "Loyalty program was not found");
      if (current.status === "ARCHIVED") {
        throw new LoyaltyDomainError("PROGRAM_ARCHIVED", "An archived loyalty program is immutable");
      }
      if (expectedRevision !== undefined && current.revision !== expectedRevision) {
        throw new LoyaltyDomainError("PROGRAM_CONCURRENT_CHANGE", "Loyalty program changed concurrently", true);
      }
      if (input.isDefault) await this.repository.program.clearDefault(id);
      const archivedAt = input.status === "ARCHIVED"
        ? input.archivedAt ?? new Date().toISOString()
        : input.archivedAt;
      const updated = await this.repository.program.update(id, { ...input, archivedAt });
      if (!updated) throw new LoyaltyDomainError("PROGRAM_CONCURRENT_CHANGE", "Loyalty program changed concurrently", true);
      return updated;
    });
  }

  async createDraftVersion(
    programId: string,
    input: ProgramVersionDraftInput,
    configuration: ProgramVersionConfigurationInput = {},
  ): Promise<ProgramVersion> {
    const canonical = createLoyaltyProgramRulesV1(input.rules);
    if (!canonical.valid) {
      throw new LoyaltyDomainError(
        "INVALID_PROGRAM_RULES",
        canonical.issues.map((issue) => `${issue.field.join(".")}: ${issue.message}`).join("; "),
      );
    }
    for (const rule of configuration.earningRules ?? []) validateEarningRulePolicy(rule);
    for (const definition of configuration.rewardDefinitions ?? []) {
      validateRewardConfiguration(definition.rewardType, definition.configuration, definition.configurationSchemaVersion);
    }
    if (configuration.tierPolicy) validateTierMetricSchemaVersion(configuration.tierPolicy.metricSchemaVersion);
    for (const tier of configuration.tiers ?? []) {
      validateTierPolicyExpression(tier.qualification, "qualification", tier.qualificationSchemaVersion);
      if (tier.maintenance) validateTierPolicyExpression(tier.maintenance, "maintenance", tier.qualificationSchemaVersion);
    }
    this.validateEarningRewardDefinitionReferences(
      configuration.earningRules ?? [],
      configuration.rewardDefinitions ?? [],
    );
    return this.repository.runInTransaction(async () => {
      const program = await this.repository.program.lockById(programId);
      if (!program) throw new LoyaltyDomainError("PROGRAM_NOT_FOUND", "Loyalty program was not found");
      if (program.status === "ARCHIVED") throw new LoyaltyDomainError("PROGRAM_ARCHIVED", "Cannot version an archived program");
      if (configuration.expectedProgramRevision !== undefined
        && program.revision !== configuration.expectedProgramRevision) {
        throw new LoyaltyDomainError("PROGRAM_CONCURRENT_CHANGE", "Loyalty program changed concurrently", true);
      }
      const referenceIssues = await this.validateReferences({
        storeId: program.storeId,
        rules: canonical.rules as unknown as Record<string, unknown>,
        rewardDefinitions: configuration.rewardDefinitions,
        earningRules: configuration.earningRules,
      });
      if (referenceIssues.length > 0) {
        throw new LoyaltyDomainError(
          "STALE_PROGRAM_REFERENCE",
          referenceIssues.map((issue) => `${issue.field.join(".")}: ${issue.message}`).join("; "),
        );
      }
      const version = await this.repository.program.nextVersionNumber(programId);
      const { rules: _rules, ...draft } = input;
      const created = await this.repository.program.createVersion({
        ...draft,
        programId,
        version,
        status: "DRAFT",
        rulesSchemaVersion: 1,
        rules: canonical.rules as unknown as Record<string, unknown>,
        publishedAt: null,
        publishedById: null,
      });
      for (const rule of configuration.earningRules ?? []) {
        await this.repository.earningRule.create({ ...rule, programVersionId: created.id });
      }
      for (const definition of configuration.rewardDefinitions ?? []) {
        await this.repository.reward.createDefinition({ ...definition, programVersionId: created.id });
      }
      if (configuration.tierPolicy) {
        await this.repository.tier.createPolicy({ ...configuration.tierPolicy, programVersionId: created.id });
      }
      for (const tier of configuration.tiers ?? []) {
        await this.repository.tier.createTier({ ...tier, programVersionId: created.id });
      }
      await this.repository.program.update(program.id, {});
      return created;
    });
  }

  async updateDraftVersion(
    versionId: string,
    input: Partial<ProgramVersionDraftInput>,
    expectedRevision?: number,
  ): Promise<ProgramVersion> {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.program.lockVersionById(versionId);
      if (!current) throw new LoyaltyDomainError("PROGRAM_VERSION_NOT_FOUND", "Program version was not found");
      if (current.status !== "DRAFT") throw new LoyaltyDomainError("PROGRAM_VERSION_IMMUTABLE", "Published versions are immutable");
      if (expectedRevision !== undefined && current.revision !== expectedRevision) {
        throw new LoyaltyDomainError("PROGRAM_VERSION_CONCURRENT_CHANGE", "Loyalty program version changed concurrently", true);
      }
      const rules = input.rules
        ? createLoyaltyProgramRulesV1(input.rules)
        : { valid: true as const, rules: current.rules };
      if (!rules.valid) {
        throw new LoyaltyDomainError(
          "INVALID_PROGRAM_RULES",
          rules.issues.map((issue) => `${issue.field.join(".")}: ${issue.message}`).join("; "),
        );
      }
      const referenceIssues = await this.validateReferences({
        storeId: current.storeId,
        rules: rules.rules as unknown as Record<string, unknown>,
      });
      if (referenceIssues.length > 0) {
        throw new LoyaltyDomainError("STALE_PROGRAM_REFERENCE", referenceIssues.map(({ message }) => message).join("; "));
      }
      const { rules: _rules, ...changes } = input;
      const updated = await this.repository.program.updateDraftVersion(versionId, {
        ...changes,
        rules: rules.rules as unknown as Record<string, unknown>,
        rulesSchemaVersion: 1,
      });
      if (!updated) throw new LoyaltyDomainError("PROGRAM_VERSION_CONCURRENT_CHANGE", "Program version changed concurrently", true);
      return updated;
    });
  }

  async deleteDraftVersion(versionId: string, expectedRevision?: number): Promise<void> {
    await this.repository.runInTransaction(async () => {
      const current = await this.requireDraftVersion(versionId);
      if (expectedRevision !== undefined && current.revision !== expectedRevision) {
        throw new LoyaltyDomainError("PROGRAM_VERSION_CONCURRENT_CHANGE", "Loyalty program version changed concurrently", true);
      }
      const tiers = await this.repository.tier.listForVersion(versionId);
      for (const tier of tiers) {
        for (const benefit of await this.repository.reward.listTierBenefits(tier.id)) {
          await this.repository.reward.deleteTierBenefit(benefit.id);
        }
      }
      for (const tier of tiers) await this.repository.tier.deleteTier(tier.id);
      if (await this.repository.tier.findPolicy(versionId)) {
        await this.repository.tier.deletePolicy(versionId);
      }
      for (const definition of await this.repository.reward.listDefinitions(versionId)) {
        await this.repository.reward.deleteDefinition(definition.id);
      }
      for (const rule of await this.repository.earningRule.listForVersion(versionId)) {
        await this.repository.earningRule.delete(rule.id);
      }
      if (!await this.repository.program.deleteDraftVersion(versionId)) {
        throw new LoyaltyDomainError("PROGRAM_VERSION_CONCURRENT_CHANGE", "Loyalty program version changed concurrently", true);
      }
      await this.repository.program.update(current.programId, {});
    });
  }

  async createEarningRule(versionId: string, input: EarningRuleDraftInput) {
    validateEarningRulePolicy(input);
    return this.repository.runInTransaction(async () => {
      const version = await this.requireDraftVersion(versionId);
      await this.requireValidReferences({ storeId: version.storeId, rules: version.rules, earningRules: [input] });
      this.validateEarningRewardDefinitionReferences(
        [input],
        await this.repository.reward.listDefinitions(versionId),
      );
      return this.repository.earningRule.create({ ...input, programVersionId: versionId });
    });
  }

  async updateEarningRule(id: string, input: Parameters<Repository["earningRule"]["update"]>[1]) {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.earningRule.findById(id);
      if (!current) throw new LoyaltyDomainError("EARNING_RULE_NOT_FOUND", "Loyalty earning rule was not found");
      await this.requireDraftVersion(current.programVersionId);
      const next = { ...current, ...input };
      validateEarningRulePolicy(next);
      const version = await this.repository.program.findVersionById(current.programVersionId);
      if (!version) throw new LoyaltyDomainError("PROGRAM_VERSION_NOT_FOUND", "Program version was not found");
      await this.requireValidReferences({ storeId: version.storeId, rules: version.rules, earningRules: [next] });
      this.validateEarningRewardDefinitionReferences(
        [next],
        await this.repository.reward.listDefinitions(current.programVersionId),
      );
      const updated = await this.repository.earningRule.update(id, input);
      if (!updated) throw new LoyaltyDomainError("EARNING_RULE_NOT_FOUND", "Loyalty earning rule was not found");
      return updated;
    });
  }

  async deleteEarningRule(id: string): Promise<void> {
    await this.repository.runInTransaction(async () => {
      const current = await this.repository.earningRule.findById(id);
      if (!current) throw new LoyaltyDomainError("EARNING_RULE_NOT_FOUND", "Loyalty earning rule was not found");
      await this.requireDraftVersion(current.programVersionId);
      if (!await this.repository.earningRule.delete(id)) throw new LoyaltyDomainError("EARNING_RULE_NOT_FOUND", "Loyalty earning rule was not found");
    });
  }

  async createRewardDefinition(versionId: string, input: RewardDefinitionDraftInput) {
    validateRewardConfiguration(input.rewardType, input.configuration, input.configurationSchemaVersion);
    return this.repository.runInTransaction(async () => {
      const version = await this.requireDraftVersion(versionId);
      await this.requireValidReferences({ storeId: version.storeId, rules: version.rules, rewardDefinitions: [input] });
      return this.repository.reward.createDefinition({ ...input, programVersionId: versionId });
    });
  }

  async updateRewardDefinition(id: string, input: Parameters<Repository["reward"]["updateDefinition"]>[1]) {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.reward.findDefinitionById(id);
      if (!current) throw new LoyaltyDomainError("REWARD_DEFINITION_NOT_FOUND", "Loyalty reward definition was not found");
      const version = await this.requireDraftVersion(current.programVersionId);
      const next = { ...current, ...input };
      validateRewardConfiguration(next.rewardType, next.configuration, next.configurationSchemaVersion);
      await this.requireValidReferences({ storeId: version.storeId, rules: version.rules, rewardDefinitions: [next] });
      const updated = await this.repository.reward.updateDefinition(id, input);
      if (!updated) throw new LoyaltyDomainError("REWARD_DEFINITION_NOT_FOUND", "Loyalty reward definition was not found");
      return updated;
    });
  }

  async deleteRewardDefinition(id: string): Promise<void> {
    await this.repository.runInTransaction(async () => {
      const current = await this.repository.reward.findDefinitionById(id);
      if (!current) throw new LoyaltyDomainError("REWARD_DEFINITION_NOT_FOUND", "Loyalty reward definition was not found");
      await this.requireDraftVersion(current.programVersionId);
      const referenced = (await this.repository.earningRule.listForVersion(current.programVersionId)).some((rule) => {
        const action = rule.action as { type?: unknown; rewardDefinitionCode?: unknown };
        return action.type === "ISSUE_REWARD" && action.rewardDefinitionCode === current.code;
      });
      if (referenced) {
        throw new LoyaltyDomainError(
          "REWARD_DEFINITION_IN_USE",
          "Reward definition is referenced by an earning rule",
        );
      }
      for (const tier of await this.repository.tier.listForVersion(current.programVersionId)) {
        for (const benefit of await this.repository.reward.listTierBenefits(tier.id)) {
          if (benefit.rewardDefinitionId === id) {
            await this.repository.reward.deleteTierBenefit(benefit.id);
          }
        }
      }
      if (!await this.repository.reward.deleteDefinition(id)) throw new LoyaltyDomainError("REWARD_DEFINITION_NOT_FOUND", "Loyalty reward definition was not found");
    });
  }

  async upsertTierPolicy(versionId: string, input: TierPolicyDraftInput) {
    validateTierMetricSchemaVersion(input.metricSchemaVersion);
    return this.repository.runInTransaction(async () => {
      await this.requireDraftVersion(versionId);
      const current = await this.repository.tier.findPolicy(versionId);
      if (current) {
        const updated = await this.repository.tier.updatePolicy(versionId, input);
        if (!updated) throw new LoyaltyDomainError("TIER_POLICY_NOT_FOUND", "Loyalty tier policy was not found");
        return updated;
      }
      return this.repository.tier.createPolicy({ ...input, programVersionId: versionId });
    });
  }

  async deleteTierPolicy(versionId: string): Promise<void> {
    await this.repository.runInTransaction(async () => {
      await this.requireDraftVersion(versionId);
      if (!await this.repository.tier.deletePolicy(versionId)) throw new LoyaltyDomainError("TIER_POLICY_NOT_FOUND", "Loyalty tier policy was not found");
    });
  }

  async createTier(versionId: string, input: Omit<NewTier, "id" | "storeId" | "programVersionId" | "createdAt">) {
    validateTierPolicyExpression(input.qualification, "qualification", input.qualificationSchemaVersion);
    if (input.maintenance) validateTierPolicyExpression(input.maintenance, "maintenance", input.qualificationSchemaVersion);
    return this.repository.runInTransaction(async () => {
      await this.requireDraftVersion(versionId);
      return this.repository.tier.createTier({ ...input, programVersionId: versionId });
    });
  }

  async updateTier(id: string, input: Parameters<Repository["tier"]["updateTier"]>[1]) {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.tier.findTierById(id);
      if (!current) throw new LoyaltyDomainError("TIER_NOT_FOUND", "Loyalty tier was not found");
      await this.requireDraftVersion(current.programVersionId);
      const next = { ...current, ...input };
      validateTierPolicyExpression(next.qualification, "qualification", next.qualificationSchemaVersion);
      if (next.maintenance) validateTierPolicyExpression(next.maintenance, "maintenance", next.qualificationSchemaVersion);
      const updated = await this.repository.tier.updateTier(id, input);
      if (!updated) throw new LoyaltyDomainError("TIER_NOT_FOUND", "Loyalty tier was not found");
      return updated;
    });
  }

  async deleteTier(id: string): Promise<void> {
    await this.repository.runInTransaction(async () => {
      const current = await this.repository.tier.findTierById(id);
      if (!current) throw new LoyaltyDomainError("TIER_NOT_FOUND", "Loyalty tier was not found");
      await this.requireDraftVersion(current.programVersionId);
      for (const benefit of await this.repository.reward.listTierBenefits(id)) {
        await this.repository.reward.deleteTierBenefit(benefit.id);
      }
      if (!await this.repository.tier.deleteTier(id)) throw new LoyaltyDomainError("TIER_NOT_FOUND", "Loyalty tier was not found");
    });
  }

  async createTierRewardBenefit(input: {
    tierId: string;
    rewardDefinitionId: string;
    grantPolicySchemaVersion: number;
    grantPolicy: Record<string, unknown>;
  }) {
    validateTierRewardGrantPolicy(input.grantPolicy, input.grantPolicySchemaVersion);
    return this.repository.runInTransaction(async () => {
      const [tier, definition] = await Promise.all([
        this.repository.tier.findTierById(input.tierId),
        this.repository.reward.findDefinitionById(input.rewardDefinitionId),
      ]);
      if (!tier) throw new LoyaltyDomainError("TIER_NOT_FOUND", "Loyalty tier was not found");
      if (!definition) throw new LoyaltyDomainError("REWARD_DEFINITION_NOT_FOUND", "Loyalty reward definition was not found");
      if (tier.programVersionId !== definition.programVersionId) {
        throw new LoyaltyDomainError("TIER_REWARD_VERSION_MISMATCH", "Tier and reward definition must belong to the same program version");
      }
      await this.requireDraftVersion(tier.programVersionId);
      return this.repository.reward.createTierBenefit(input);
    });
  }

  async deleteTierRewardBenefit(id: string): Promise<void> {
    await this.repository.runInTransaction(async () => {
      const benefit = await this.repository.reward.findTierBenefitById(id);
      if (!benefit) throw new LoyaltyDomainError("TIER_REWARD_BENEFIT_NOT_FOUND", "Loyalty tier reward benefit was not found");
      const tier = await this.repository.tier.findTierById(benefit.tierId);
      if (!tier) throw new LoyaltyDomainError("TIER_NOT_FOUND", "Loyalty tier was not found");
      await this.requireDraftVersion(tier.programVersionId);
      if (!await this.repository.reward.deleteTierBenefit(id)) throw new LoyaltyDomainError("TIER_REWARD_BENEFIT_NOT_FOUND", "Loyalty tier reward benefit was not found");
    });
  }

  async publishVersion(input: {
    versionId: string;
    expectedRevision?: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
    publishedAt: string;
    publishedById: string | null;
  }): Promise<ProgramVersion> {
    return this.repository.runInTransaction(async () => {
      const draft = await this.repository.program.lockVersionById(input.versionId);
      if (!draft) throw new LoyaltyDomainError("PROGRAM_VERSION_NOT_FOUND", "Program version was not found");
      if (draft.status !== "DRAFT") throw new LoyaltyDomainError("PROGRAM_VERSION_ALREADY_PUBLISHED", "Program version is already published");
      if (input.expectedRevision !== undefined && draft.revision !== input.expectedRevision) {
        throw new LoyaltyDomainError("PROGRAM_VERSION_CONCURRENT_CHANGE", "Loyalty program version changed concurrently", true);
      }
      const canonical = createLoyaltyProgramRulesV1(
        draft.rules as unknown as LoyaltyProgramRulesValidationInputV1,
      );
      if (!canonical.valid) throw new LoyaltyDomainError("INVALID_PROGRAM_RULES", canonical.issues.map(({ message }) => message).join("; "));
      const earningRules = await this.repository.earningRule.listForVersion(draft.id);
      const rewardDefinitions = await this.repository.reward.listDefinitions(draft.id);
      for (const rule of earningRules) validateEarningRulePolicy(rule);
      for (const definition of rewardDefinitions) {
        validateRewardConfiguration(definition.rewardType, definition.configuration, definition.configurationSchemaVersion);
      }
      const policy = await this.repository.tier.findPolicy(draft.id);
      if (policy) validateTierMetricSchemaVersion(policy.metricSchemaVersion);
      for (const tier of await this.repository.tier.listForVersion(draft.id)) {
        validateTierPolicyExpression(tier.qualification, "qualification", tier.qualificationSchemaVersion);
        if (tier.maintenance) validateTierPolicyExpression(tier.maintenance, "maintenance", tier.qualificationSchemaVersion);
        for (const benefit of await this.repository.reward.listTierBenefits(tier.id)) {
          validateTierRewardGrantPolicy(benefit.grantPolicy, benefit.grantPolicySchemaVersion);
        }
      }
      this.validateEarningRewardDefinitionReferences(earningRules, rewardDefinitions);
      const referenceIssues = await this.validateReferences({
        storeId: draft.storeId,
        rules: canonical.rules as unknown as Record<string, unknown>,
        rewardDefinitions,
        earningRules,
      });
      if (referenceIssues.length > 0) throw new LoyaltyDomainError("STALE_PROGRAM_REFERENCE", referenceIssues.map(({ message }) => message).join("; "));
      if (Date.parse(input.effectiveFrom) < Date.parse(input.publishedAt)) {
        throw new LoyaltyDomainError(
          "PROGRAM_VERSION_BACKDATING_FORBIDDEN",
          "A published program version cannot take effect before publication",
        );
      }
      const publishedVersions = (await this.repository.program.listVersions(draft.programId))
        .filter(({ id, status }) => id !== draft.id && status !== "DRAFT");
      const latestEffectiveFrom = publishedVersions
        .map(({ effectiveFrom }) => effectiveFrom)
        .filter((value): value is string => value !== null)
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
      if (latestEffectiveFrom && Date.parse(input.effectiveFrom) <= Date.parse(latestEffectiveFrom)) {
        throw new LoyaltyDomainError(
          "INVALID_PROGRAM_VERSION_WINDOW",
          "A new version must start after every previously published version",
        );
      }
      const activeNow = Date.parse(input.effectiveFrom) === Date.parse(input.publishedAt);
      const effectiveTo = input.effectiveTo === undefined ? draft.effectiveTo : input.effectiveTo;
      if (effectiveTo && Date.parse(effectiveTo) <= Date.parse(input.effectiveFrom)) {
        throw new LoyaltyDomainError("INVALID_PROGRAM_VERSION_WINDOW", "Program version effectiveTo must be after effectiveFrom");
      }
      if (activeNow) {
        const current = await this.repository.program.findActiveVersion(draft.programId);
        if (current) {
          const retired = await this.repository.program.retireActiveVersion(current.id, input.effectiveFrom);
          if (!retired) {
            throw new LoyaltyDomainError(
              "INVALID_PROGRAM_VERSION_WINDOW",
              "A new active version must start after the current version",
            );
          }
        }
      }
      const published = await this.repository.program.publishDraftVersion(draft.id, {
        status: activeNow ? "ACTIVE" : "SCHEDULED",
        effectiveFrom: input.effectiveFrom,
        effectiveTo,
        publishedAt: input.publishedAt,
        publishedById: input.publishedById,
        rules: canonical.rules as unknown as Record<string, unknown>,
        rulesSchemaVersion: 1,
      });
      if (!published) throw new LoyaltyDomainError("PROGRAM_VERSION_CONCURRENT_CHANGE", "Program version changed concurrently", true);
      if (activeNow) await this.activateProgram(published.programId);
      return published;
    });
  }

  async activateScheduled(effectiveAt: string, limit = 100): Promise<ProgramVersion[]> {
    return this.repository.runInTransaction(async () => {
      const scheduled = await this.repository.program.listScheduledForActivation(effectiveAt, limit);
      const activated: ProgramVersion[] = [];
      for (const version of scheduled) {
        const current = await this.repository.program.findActiveVersion(version.programId);
        if (current) {
          const retired = await this.repository.program.retireActiveVersion(current.id, version.effectiveFrom!);
          if (!retired) {
            throw new LoyaltyDomainError(
              "INVALID_PROGRAM_VERSION_WINDOW",
              "Scheduled version overlaps the current active version",
            );
          }
        }
        const next = await this.repository.program.transitionVersion(version.id, "SCHEDULED", "ACTIVE");
        if (next) {
          await this.activateProgram(next.programId);
          activated.push(next);
        }
      }
      return activated;
    });
  }

  private async activateProgram(programId: string): Promise<void> {
    const program = await this.repository.program.findById(programId);
    if (program && program.status !== "ACTIVE") {
      await this.repository.program.update(programId, { status: "ACTIVE" });
    }
  }

  private async requireDraftVersion(versionId: string): Promise<ProgramVersion> {
    const version = await this.repository.program.lockVersionById(versionId);
    if (!version) throw new LoyaltyDomainError("PROGRAM_VERSION_NOT_FOUND", "Program version was not found");
    if (version.status !== "DRAFT") throw new LoyaltyDomainError("PROGRAM_VERSION_IMMUTABLE", "Published versions are immutable");
    return version;
  }

  private async validateReferences(input: LoyaltyReferenceValidationRequest): Promise<readonly { field: readonly (string | number)[]; message: string }[]> {
    if (!this.references) {
      throw new LoyaltyDomainError(
        "LOYALTY_REFERENCE_VALIDATOR_REQUIRED",
        "Program rules must be validated by the cross-service reference adapter",
      );
    }
    return this.references.validate(input);
  }

  private async requireValidReferences(input: LoyaltyReferenceValidationRequest): Promise<void> {
    const issues = await this.validateReferences(input);
    if (issues.length > 0) {
      throw new LoyaltyDomainError(
        "STALE_PROGRAM_REFERENCE",
        issues.map((issue) => `${issue.field.join(".")}: ${issue.message}`).join("; "),
      );
    }
  }

  private validateEarningRewardDefinitionReferences(
    earningRules: readonly Readonly<{ action: unknown }>[],
    rewardDefinitions: readonly Readonly<{ code: string }>[],
  ): void {
    const codes = new Set(rewardDefinitions.map(({ code }) => code));
    for (const rule of earningRules) {
      const action = rule.action as { type?: unknown; rewardDefinitionCode?: unknown };
      if (action.type === "ISSUE_REWARD" && typeof action.rewardDefinitionCode === "string" && !codes.has(action.rewardDefinitionCode)) {
        throw new LoyaltyDomainError(
          "REWARD_DEFINITION_NOT_FOUND",
          `Earning rule references missing reward definition ${action.rewardDefinitionCode}`,
        );
      }
    }
  }
}
