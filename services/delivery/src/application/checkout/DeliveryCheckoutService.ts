import type { Catalog, Delivery, Pricing } from "@shopana/broker-types";
import type { DeliveryCheckoutFactsPort, DeliveryCheckoutOptionsPort } from "../../checkout-pipeline/contracts.js";
import type { DeliveryOptionBindingCandidate, DeliveryOptionBindingsPort, DeliveryProviderAccountsPort, DeliveryProviderAppsPort } from "../../contracts/ports.js";
import type { DeliveryProfileAssignmentsPort, DeliveryProfilesPort } from "../../contracts/configuration.js";
import type { DeliveryRateCachePort } from "../../contracts/rates.js";
import { conditionsMatch, zoneMatches } from "../../domain/eligibility.js";
import { optionHandle, revision } from "../../domain/canonical.js";
import type { CustomizationBindingRepository } from "../../repositories/CustomizationBindingRepository.js";
import type { DeliveryCustomizationRunner } from "../customization/DeliveryCustomizationRunner.js";

type QuotedLine = Pricing.PricingCheckoutQuotedLine;
type Fact = Extract<Catalog.ResolveCheckoutDeliveryLineResult, { status: "RESOLVED" }>;

export class DeliveryCheckoutService implements DeliveryCheckoutOptionsPort {
  constructor(private readonly dependencies: {
    facts: DeliveryCheckoutFactsPort;
    profiles: DeliveryProfilesPort;
    assignments: DeliveryProfileAssignmentsPort;
    bindings: DeliveryOptionBindingsPort;
    providerAccounts: DeliveryProviderAccountsPort;
    apps: DeliveryProviderAppsPort;
    customizationBindings: CustomizationBindingRepository;
    customization: DeliveryCustomizationRunner;
    rateCache: DeliveryRateCachePort;
    handleSecret: string;
  }) {}

  async calculateOptions(params: Delivery.CalculateCheckoutDeliveryOptionsParams): Promise<Delivery.CalculateCheckoutDeliveryOptionsResult> {
    assertRequest(params);
    const physicalLines = flatten(params.preliminary.transformedLines).filter((line) => line.merchandise.isPhysical);
    if (physicalLines.length === 0) return this.emptyResult(params);
    const factsResult = await this.dependencies.facts.resolve({
      storeId: params.context.storeId, effectiveAt: params.context.effectiveAt,
      lines: physicalLines.map((line) => ({ lineId: line.lineId, variantId: line.merchandise.variantId, quantity: line.quantity })),
    });
    if (!factsResult.ok) throw new Error(`${factsResult.code}: ${factsResult.message}`);
    const facts = new Map(factsResult.lines.filter((line): line is Fact => line.status === "RESOLVED").map((line) => [line.lineId, line]));
    const profileSet = await this.dependencies.profiles.listActiveForStore(params.context.storeId);
    if (profileSet.currencyCode !== params.context.currencyCode) throw new Error("Delivery profile set currency does not match checkout currency");
    const planned = await this.planGroups(params, profileSet, physicalLines, facts);
    const groupResults = [] as Array<{ group: Delivery.DeliveryCheckoutGroup; bindings: DeliveryOptionBindingCandidate[]; executions: Delivery.DeliveryCheckoutCarrierServiceExecution[]; issues: Delivery.DeliveryCheckoutIssue[] }>;
    for (const plan of planned) groupResults.push(await this.rateGroup(params, plan));
    const ratePlanRevision = revision("drp_v1", planned.map((plan) => ({ groupId: plan.groupId, ratedFactsHash: plan.ratedFactsHash })));
    const eligibilityRevision = revision("delig_v1", planned.map((plan) => plan.eligibility.eligibilityRevision));
    const activeCustomizations = await this.dependencies.customizationBindings.listActive(params.context.storeId);
    const customization = await this.dependencies.customization.run(customizationInput(params, planned, groupResults), activeCustomizations.bindings, activeCustomizations.bindingSetRevision, params.context.deadlineAt);
    for (const entry of groupResults) {
      const customized = customization.groups.find((group) => group.groupId === entry.group.groupId);
      if (customized) entry.group = { ...entry.group, options: customized.options };
    }
    if (groupResults.length > 0) groupResults[0]!.issues.push(...customization.issues);
    const customizationPolicyRevision = activeCustomizations.policyRevision;
    const customizationRevision = customization.revision;
    const reconciled = await Promise.all(groupResults.map((entry) => this.reconcile(params, entry.group, entry.bindings)));
    const groups = reconciled.map(({ group }) => group);
    const orphanedSelectionResets = params.selections.filter((selection) => !groups.some((group) => group.groupId === selection.groupId)).map((selection) => ({
      groupId: selection.groupId, previousOptionHandle: selection.optionHandle, customerInput: selection.customerInput,
      reason: { code: "DELIVERY_GROUP_REMOVED", message: "The previously selected delivery group is no longer available." },
    }));
    const resultBase = {
      executionId: params.context.executionId, checkoutId: params.context.checkoutId,
      basedOnCheckoutVersion: params.context.expectedCheckoutVersion, currencyCode: params.context.currencyCode,
      basedOnPreliminaryRevision: params.preliminary.revision, ratePlanRevision, eligibilityRevision,
      customizationRevision, customizationPolicyRevision, groups, orphanedSelectionResets,
      carrierServiceExecutions: groupResults.flatMap(({ executions }) => executions),
      issues: groupResults.flatMap(({ issues }) => issues),
    };
    const result = { ...resultBase, revision: revision("delivery_v1", resultBase) };
    const staged = await this.dependencies.bindings.stageCheckoutSnapshot({
      storeId: params.context.storeId, checkoutId: params.context.checkoutId,
      basedOnCheckoutVersion: params.context.expectedCheckoutVersion, targetCheckoutVersion: params.context.targetCheckoutVersion,
      preliminaryRevision: params.preliminary.revision, deliveryRevision: result.revision,
      options: groupResults.flatMap(({ bindings }) => bindings.map((candidate) => ({ candidate, group: groups.find((group) => group.groupId === candidate.binding.groupId) })).filter(({ candidate, group }) => group?.options.some((option) => option.handle === candidate.option.handle)).map(({ candidate }) => withBindingRevisions(candidate, ratePlanRevision, eligibilityRevision, customizationRevision, customizationPolicyRevision))),
      retainUntil: new Date(Math.max(Date.parse(params.context.deadlineAt) + 15 * 60_000, Date.parse(params.context.effectiveAt) + 15 * 60_000)).toISOString(),
    });
    if (staged.status !== "STAGED") throw new Error(`Delivery option binding staging failed: ${staged.status}`);
    return result;
  }

  async searchOptionChoices(params: Delivery.SearchDeliveryOptionChoicesParams): Promise<Delivery.SearchDeliveryOptionChoicesResult> {
    const resolved = await this.dependencies.bindings.resolve({ storeId: params.storeId, checkoutId: params.checkoutId, checkoutVersion: params.checkoutVersion,
      groupId: params.groupId, optionHandle: params.optionHandle, effectiveAt: params.effectiveAt });
    if (resolved.status !== "FOUND" || resolved.binding.source !== "CARRIER_SERVICE" || resolved.binding.customerInputContract === null) throw new Error("Delivery option does not support customer-input discovery");
    const route = await this.dependencies.apps.resolveRoute({ storeId: params.storeId, capability: "delivery.carrier-service", operation: "searchCustomerInputOptions", installationId: resolved.binding.quoteRoute.installationId });
    if (!route || route.operation !== "searchCustomerInputOptions") throw new Error("Carrier customer-input discovery route is unavailable");
    const result = await deadline(this.dependencies.apps.searchCustomerInputOptions(route, { protocolVersion: 2, correlationId: params.correlationId,
      deadlineAt: params.deadlineAt, effectiveAt: params.effectiveAt, storeId: params.storeId, providerAccountId: resolved.binding.carrierServiceAccountId,
      serviceCode: resolved.binding.serviceCode, customerInputContractHash: resolved.binding.customerInputContract.schemaHash,
      query: params.query, cursor: params.cursor, limit: params.limit }), params.deadlineAt);
    return { ...result, options: result.options.map((option) => ({ ...option, publicData: projectPublicData(option.publicData) })) };
  }

  private emptyResult(params: Delivery.CalculateCheckoutDeliveryOptionsParams): Delivery.CalculateCheckoutDeliveryOptionsResult {
    const base = { executionId: params.context.executionId, checkoutId: params.context.checkoutId, basedOnCheckoutVersion: params.context.expectedCheckoutVersion,
      currencyCode: params.context.currencyCode, basedOnPreliminaryRevision: params.preliminary.revision,
      ratePlanRevision: revision("drp_v1", []), eligibilityRevision: revision("delig_v1", []),
      customizationRevision: revision("dcust_v1", []), customizationPolicyRevision: "delivery-customization-policy-v1",
      groups: [], orphanedSelectionResets: params.selections.map((selection) => ({ groupId: selection.groupId, previousOptionHandle: selection.optionHandle,
        customerInput: selection.customerInput, reason: { code: "DELIVERY_GROUP_REMOVED", message: "The previously selected delivery group is no longer available." } })),
      carrierServiceExecutions: [], issues: [] };
    return { ...base, revision: revision("delivery_v1", base) };
  }

  private async planGroups(params: Delivery.CalculateCheckoutDeliveryOptionsParams, profileSet: Delivery.DeliveryProfileSetSnapshot, lines: readonly QuotedLine[], facts: Map<string, Fact>): Promise<GroupPlan[]> {
    const buckets = new Map<string, { destination: Delivery.DeliveryCheckoutDestinationIntent; profile: Delivery.DeliveryProfileSnapshot; lines: QuotedLine[]; matchedBy: "SELLING_PLAN" | "VARIANT" | "DEFAULT" }>();
    for (const destination of params.destinations) for (const lineId of destination.lineIds) {
      const line = lines.find((candidate) => candidate.lineId === lineId);
      if (!line) continue;
      const assignment = await this.dependencies.assignments.resolve({ storeId: params.context.storeId, variantId: line.merchandise.variantId,
        sellingPlanGroupId: line.purchase.sellingPlanId, activeProfileSetRevision: profileSet.revision });
      if (assignment.status !== "MATCHED") throw new Error("Delivery profile assignment changed while planning");
      const profile = profileSet.profiles.find((candidate) => candidate.profileId === assignment.profileId);
      if (!profile) throw new Error("Assigned delivery profile is absent from the active set");
      const key = `${destination.destinationId}:${profile.profileId}`;
      const bucket = buckets.get(key) ?? { destination, profile, lines: [], matchedBy: assignment.matchedBy };
      if (assignment.matchedBy === "SELLING_PLAN") bucket.matchedBy = "SELLING_PLAN";
      bucket.lines.push(line); buckets.set(key, bucket);
    }
    return [...buckets.values()].sort((a, b) => `${a.destination.destinationId}:${a.profile.profileId}`.localeCompare(`${b.destination.destinationId}:${b.profile.profileId}`)).map((bucket) => buildGroupPlan(params, profileSet, bucket, facts));
  }

  private async rateGroup(params: Delivery.CalculateCheckoutDeliveryOptionsParams, plan: GroupPlan) {
    const candidates: DeliveryOptionBindingCandidate[] = [];
    const executions: Delivery.DeliveryCheckoutCarrierServiceExecution[] = [];
    const issues = [...plan.issues];
    if (issues.some((entry) => entry.severity === "ERROR")) {
      return { group: { groupId: plan.groupId, destinationId: plan.destination.destinationId, lineIds: plan.lines.map((line) => line.lineId).sort(), options: [], selection: { status: "NONE" as const } }, bindings: candidates, executions, issues };
    }
    for (const method of plan.eligibility.methodDefinitions) {
      if (method.rateSource.type === "MANUAL") {
        const manualMethod = { ...method, rateSource: method.rateSource } as Delivery.DeliveryMethodDefinitionSnapshot & { rateSource: Extract<Delivery.DeliveryMethodRateSource, { type: "MANUAL" }> };
        candidates.push(manualCandidate(params, plan, manualMethod, this.dependencies.handleSecret));
      } else {
        const carrierMethod = { ...method, rateSource: method.rateSource } as Delivery.DeliveryMethodDefinitionSnapshot & { rateSource: Extract<Delivery.DeliveryMethodRateSource, { type: "CARRIER_SERVICE" }> };
        await this.addCarrierRates(params, plan, carrierMethod, candidates, executions, issues);
      }
    }
    const options = candidates.map(({ option }) => option).sort((a, b) => BigInt(a.cost.amountMinor) < BigInt(b.cost.amountMinor) ? -1 : BigInt(a.cost.amountMinor) > BigInt(b.cost.amountMinor) ? 1 : a.handle.localeCompare(b.handle));
    return { group: { groupId: plan.groupId, destinationId: plan.destination.destinationId, lineIds: plan.lines.map((line) => line.lineId).sort(), options, selection: { status: "NONE" as const } }, bindings: candidates, executions, issues };
  }

  private async addCarrierRates(params: Delivery.CalculateCheckoutDeliveryOptionsParams, plan: GroupPlan, method: Delivery.DeliveryMethodDefinitionSnapshot & { rateSource: Extract<Delivery.DeliveryMethodRateSource, { type: "CARRIER_SERVICE" }> }, candidates: DeliveryOptionBindingCandidate[], executions: Delivery.DeliveryCheckoutCarrierServiceExecution[], issues: Delivery.DeliveryCheckoutIssue[]) {
    for (const accountId of method.rateSource.carrierServiceAccountIds) {
      const account = await this.dependencies.providerAccounts.getById(params.context.storeId, accountId);
      if (!account || account.capabilityStates.carrierService?.status !== "ACTIVE") continue;
      if (!account.supportedOperations.includes("quoteRates") || !account.supportedCurrencyCodes.includes(params.context.currencyCode) ||
        (account.supportedCountryCodes.length > 0 && !account.supportedCountryCodes.includes(plan.destination.address.countryCode))) continue;
      const route = await this.dependencies.apps.resolveRoute({ storeId: params.context.storeId, capability: "delivery.carrier-service", operation: "quoteRates", installationId: account.installationId });
      if (!route || route.operation !== "quoteRates") { issues.push(issue(plan.groupId, accountId, "DELIVERY_PROVIDER_ROUTE_UNAVAILABLE", "The configured carrier route is unavailable.", true)); continue; }
      if (route.appCode !== account.appCode || route.appVersion !== account.appVersion) { issues.push(issue(plan.groupId, accountId, "DELIVERY_PROVIDER_ROUTE_IDENTITY_MISMATCH", "The configured carrier App version changed and must be revalidated.", false)); continue; }
      const request: Delivery.DeliveryCarrierServiceRateRequest = {
        protocolVersion: 2, quoteRequestId: revision("dquote_v1", [params.context.checkoutId, params.context.expectedCheckoutVersion, plan.groupId, accountId, route.routeRevision, plan.ratedFactsHash]),
        executionId: params.context.executionId, correlationId: params.context.correlationId, deadlineAt: params.context.deadlineAt,
        effectiveAt: params.context.effectiveAt, storeId: params.context.storeId, checkoutId: params.context.checkoutId,
        basedOnCheckoutVersion: params.context.expectedCheckoutVersion, targetCheckoutVersion: params.context.targetCheckoutVersion,
        groupId: plan.groupId, ratePlanRevision: plan.ratePlanRevision, eligibilityRevision: plan.eligibility.eligibilityRevision,
        ratedFactsHash: plan.ratedFactsHash, currencyCode: params.context.currencyCode, localeCode: params.context.localeCode,
        channelCode: params.context.channelCode, origin: plan.origin, destination: providerDestination(plan.destination), packages: [plan.package],
      };
      const cacheIdentity = { storeId: params.context.storeId, checkoutId: params.context.checkoutId, basedOnCheckoutVersion: params.context.expectedCheckoutVersion,
        quoteRequestId: request.quoteRequestId, carrierServiceAccountId: accountId, routeRevision: route.routeRevision,
        carrierServiceConfigurationRevision: account.capabilityStates.carrierService.configurationRevision,
        executionPolicyRevision: "delivery-provider-policy-v1", eligibilityRevision: plan.eligibility.eligibilityRevision,
        ratedFactsHash: plan.ratedFactsHash, effectiveAt: params.context.effectiveAt };
      const started = Date.now(); const startedAt = new Date(started).toISOString();
      try {
        const cached = await this.dependencies.rateCache.get(cacheIdentity);
        const result = cached.status === "HIT" ? cached.result : await deadline(this.dependencies.apps.quoteRates(route, request), params.context.deadlineAt);
        if (result.quoteRequestId !== request.quoteRequestId) throw new Error("Carrier quote ID mismatch");
        const accepted = result.rates.filter((rate) => rate.cost.currencyCode === params.context.currencyCode && (method.rateSource.allowedServiceCodes.length === 0 || method.rateSource.allowedServiceCodes.includes(rate.serviceCode)));
        for (const rate of accepted) candidates.push(carrierCandidate(params, plan, method, account, route, result.revision, rate, this.dependencies.handleSecret));
        if (cached.status !== "HIT") await this.dependencies.rateCache.put({ ...cacheIdentity, result, cachedAt: new Date().toISOString(), expiresAt: new Date(Date.parse(params.context.effectiveAt) + 300_000).toISOString() });
        const completedAt = new Date().toISOString(); executions.push({ groupId: plan.groupId, carrierServiceAccountId: accountId, route, executionPolicyRevision: "delivery-provider-policy-v1",
          rateCount: accepted.length, durationMs: Date.parse(completedAt) - started, attemptCount: cached.status === "HIT" ? 0 : 1, rateSource: cached.status === "HIT" ? "CARRIER_SERVICE_CACHE" : "CARRIER_SERVICE_LIVE", startedAt, completedAt,
          status: accepted.length > 0 ? "SUCCEEDED" : "NO_SERVICE", failure: null });
      } catch (error) {
        const completedAt = new Date().toISOString(); const timedOut = Date.now() >= Date.parse(params.context.deadlineAt);
        const failure = timedOut
          ? { category: "TIMEOUT" as const, code: "DELIVERY_PROVIDER_TIMEOUT", message: "Carrier rates could not be loaded.", retryable: true, acceptedByProvider: false, providerCode: null }
          : { category: "PROVIDER_UNAVAILABLE" as const, code: "DELIVERY_PROVIDER_UNAVAILABLE", message: "Carrier rates could not be loaded.", retryable: true, acceptedByProvider: false, providerCode: null };
        const useBackup = plan.profile.failurePolicy.mode === "USE_BACKUP_RATE" && method.rateSource.backupRate !== null && plan.profile.failurePolicy.categories.includes(failure.category as Delivery.DeliveryRateFallbackCategory);
        if (useBackup) {
          const fallbackRate: Delivery.DeliveryCarrierServiceRate = { serviceCode: `backup-${method.code}`, serviceName: method.title, description: method.description ?? method.title,
            cost: method.rateSource.backupRate!, estimatedMinDeliveryAt: null, estimatedMaxDeliveryAt: null, phoneRequired: false, customerInputContract: null, publicData: {} };
          candidates.push(carrierCandidate(params, plan, method, account, route, "backup-rate-v1", fallbackRate, this.dependencies.handleSecret));
          executions.push({ groupId: plan.groupId, carrierServiceAccountId: accountId, route, executionPolicyRevision: "delivery-provider-policy-v1", rateCount: 1,
            durationMs: Date.parse(completedAt) - started, attemptCount: 1, rateSource: "BACKUP_RATE", startedAt, completedAt, status: "BACKUP_RATE_APPLIED", failure });
          issues.push(warning(plan.groupId, accountId, "DELIVERY_BACKUP_RATE_APPLIED", "A merchant backup delivery rate was applied.", true));
        } else {
          if (timedOut) executions.push({ groupId: plan.groupId, carrierServiceAccountId: accountId, route, executionPolicyRevision: "delivery-provider-policy-v1", rateCount: 0,
            durationMs: Date.parse(completedAt) - started, attemptCount: 1, rateSource: "CARRIER_SERVICE_LIVE", startedAt, completedAt,
            status: "TIMED_OUT", failure: { ...failure, category: "TIMEOUT" } });
          else executions.push({ groupId: plan.groupId, carrierServiceAccountId: accountId, route, executionPolicyRevision: "delivery-provider-policy-v1", rateCount: 0,
            durationMs: Date.parse(completedAt) - started, attemptCount: 1, rateSource: "CARRIER_SERVICE_LIVE", startedAt, completedAt,
            status: "FAILED", failure });
          const target = plan.profile.failurePolicy.mode === "OMIT_PROVIDER_RATES" ? warning : issue;
          issues.push(target(plan.groupId, accountId, failure.code, failure.message, true));
        }
      }
    }
  }

  private async reconcile(params: Delivery.CalculateCheckoutDeliveryOptionsParams, group: Delivery.DeliveryCheckoutGroup, candidates: readonly DeliveryOptionBindingCandidate[]) {
    const selection = params.selections.find((intent) => intent.groupId === group.groupId);
    if (!selection) return { group };
    const currentCandidate = candidates.find(({ option }) => option.handle === selection.optionHandle);
    if (!currentCandidate) return { group: { ...group, selection: reset(selection, "DELIVERY_OPTION_CHANGED", "The selected delivery option is no longer available.") } };
    const old = await this.dependencies.bindings.resolve({ storeId: params.context.storeId, checkoutId: params.context.checkoutId,
      checkoutVersion: params.context.expectedCheckoutVersion, groupId: group.groupId, optionHandle: selection.optionHandle, effectiveAt: params.context.effectiveAt });
    if (old.status !== "FOUND") return { group: { ...group, selection: reset(selection, "DELIVERY_OPTION_EXPIRED", "The selected delivery option has expired.") } };
    if (currentCandidate.option.customerInputContract === null && selection.customerInput !== null) return { group: { ...group, selection: reset(selection, "DELIVERY_CUSTOMER_INPUT_UNEXPECTED", "This delivery option does not accept customer input.") } };
    if (currentCandidate.option.customerInputContract !== null && !matchesSchema(currentCandidate.option.customerInputContract.schema, selection.customerInput)) return { group: { ...group, selection: reset(selection, "DELIVERY_CUSTOMER_INPUT_INVALID", "The selected delivery customer input does not match the option contract.") } };
    let normalized = selection.customerInput;
    if (currentCandidate.binding.source === "CARRIER_SERVICE" && currentCandidate.option.customerInputContract !== null) {
      const route = await this.dependencies.apps.resolveRoute({ storeId: params.context.storeId, capability: "delivery.carrier-service", operation: "resolveCustomerInput", installationId: currentCandidate.binding.quoteRoute.installationId });
      if (!route || route.operation !== "resolveCustomerInput") throw new Error("Carrier customer-input resolver is unavailable");
      const semantic = await deadline(this.dependencies.apps.resolveCustomerInput(route, {
        protocolVersion: 2, correlationId: params.context.correlationId, deadlineAt: params.context.deadlineAt, effectiveAt: params.context.effectiveAt,
        storeId: params.context.storeId, providerAccountId: currentCandidate.binding.carrierServiceAccountId,
        serviceCode: currentCandidate.binding.serviceCode, customerInputContractHash: currentCandidate.option.customerInputContract.schemaHash,
        value: selection.customerInput,
      }), params.context.deadlineAt);
      if (semantic.status === "INVALID") return { group: { ...group, selection: reset(selection, "DELIVERY_CUSTOMER_INPUT_INVALID", "The selected delivery location or customer input is invalid.") } };
      normalized = semantic.normalized;
    }
    return { group: { ...group, selection: { status: "SELECTED" as const, optionHandle: selection.optionHandle, customerInput: normalized } } };
  }
}

interface GroupPlan { groupId: string; destination: Delivery.DeliveryCheckoutDestinationIntent; profile: Delivery.DeliveryProfileSnapshot; lines: QuotedLine[]; origin: Delivery.DeliveryProviderOrigin; package: Delivery.DeliveryProviderPackage; ratedFactsHash: string; ratePlanRevision: string; eligibility: Delivery.DeliveryEligibilitySnapshot; issues: Delivery.DeliveryCheckoutIssue[]; }

function buildGroupPlan(params: Delivery.CalculateCheckoutDeliveryOptionsParams, set: Delivery.DeliveryProfileSetSnapshot, bucket: { destination: Delivery.DeliveryCheckoutDestinationIntent; profile: Delivery.DeliveryProfileSnapshot; lines: QuotedLine[]; matchedBy: "SELLING_PLAN" | "VARIANT" | "DEFAULT" }, facts: Map<string, Fact>): GroupPlan {
  const capableLocation = (group: Delivery.DeliveryLocationGroupSnapshot) => group.fulfillmentLocationIds.find((id) => bucket.lines.every((line) => { const fact = facts.get(line.lineId); const location = fact?.fulfillmentLocations.find((candidate) => candidate.locationId === id); return location && (location.availableQuantity === null || location.availableQuantity >= line.quantity); }));
  const locationGroup = bucket.profile.locationGroups.find((group) => capableLocation(group) !== undefined) ?? bucket.profile.locationGroups[0];
  const locationId = capableLocation(locationGroup);
  const firstFact = facts.get(bucket.lines[0]!.lineId); const location = firstFact?.fulfillmentLocations.find((candidate) => candidate.locationId === locationId) ?? firstFact?.fulfillmentLocations[0];
  const origin = { fulfillmentLocationId: location?.locationId ?? locationGroup.fulfillmentLocationIds[0], warehouseId: location?.locationId ?? null,
    address: location?.address ?? { countryCode: bucket.destination.address.countryCode, provinceCode: null, provinceName: null, city: bucket.destination.address.city, postalCode: null, addressLine1: null, addressLine2: null } };
  const groupId = revision("dgrp_v1", [params.context.storeId, params.context.checkoutId, bucket.destination.destinationId, bucket.profile.profileId, locationGroup.locationGroupId, origin.fulfillmentLocationId, bucket.lines.map((line) => line.lineId).sort()]);
  const issues: Delivery.DeliveryCheckoutIssue[] = [];
  if (!locationId) issues.push(issue(groupId, null, "DELIVERY_NO_FULFILLMENT_LOCATION", "No fulfillment location can cover the complete delivery group.", false));
  if (bucket.lines.some((line) => facts.get(line.lineId)?.weightGrams == null)) issues.push(issue(groupId, null, "DELIVERY_WEIGHT_REQUIRED", "A physical line is missing its delivery weight.", false));
  const items = bucket.lines.map((line) => { const fact = facts.get(line.lineId); return { lineId: line.lineId, variantId: line.merchandise.variantId, sku: line.merchandise.sku, title: line.merchandise.title,
    quantity: line.quantity, weightGrams: fact?.weightGrams ?? 0, dimensionsMm: fact?.dimensionsMm ?? null, unitDeclaredValue: line.unitPrice, customs: fact?.customs ?? null, metadata: null }; });
  const packageSnapshot: Delivery.DeliveryProviderPackage = { packageId: revision("dpkg_v1", [groupId, items]), weightGrams: items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0), dimensionsMm: null,
    declaredValue: { amountMinor: bucket.lines.reduce((sum, line) => sum + BigInt(line.total.amountMinor), 0n).toString(), currencyCode: params.context.currencyCode }, items, customs: null };
  if (origin.address.countryCode !== bucket.destination.address.countryCode && items.some((item) => item.customs === null)) issues.push(issue(groupId, null, "DELIVERY_CUSTOMS_REQUIRED", "International delivery requires customs facts for every physical line.", false));
  const selectedZone = locationGroup.zones.filter(({ zone }) => zoneMatches(zone, bucket.destination.address)).sort((a, b) => a.zone.priority - b.zone.priority || a.zone.zoneId.localeCompare(b.zone.zoneId))[0];
  if (!selectedZone) issues.push(issue(groupId, null, "DELIVERY_ZONE_UNAVAILABLE", "No delivery zone matches the destination.", false));
  const subtotalMinor = bucket.lines.reduce((sum, line) => sum + BigInt(line.total.amountMinor), 0n);
  const methods = (selectedZone?.methods ?? []).filter((method) => method.active && conditionsMatch({ set: method.conditions, currencyCode: params.context.currencyCode, subtotalMinor,
    weightGrams: packageSnapshot.weightGrams, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), channelCode: params.context.channelCode,
    segmentIds: params.context.buyerEligibility?.segmentIds ?? [], purchaseTypes: [...new Set(bucket.lines.map((line) => line.purchase.type))] }));
  const eligibility: Delivery.DeliveryEligibilitySnapshot = { eligibilityRevision: revision("delig_v1", [set.revision, bucket.profile.revision, locationGroup.revision, selectedZone?.zone.revision ?? 0, methods.map((method) => method.revision), params.context.buyerEligibility?.segmentMembershipRevision]),
    organizationId: set.organizationId, storeId: set.storeId, currencyCode: set.currencyCode, profileSetRevision: set.revision, profileId: bucket.profile.profileId, profileRevision: bucket.profile.revision,
    assignmentMatch: bucket.profile.isDefault ? { matchedBy: "DEFAULT", assignmentSetId: null, assignmentRevision: null } : { matchedBy: bucket.matchedBy === "SELLING_PLAN" ? "SELLING_PLAN" : "VARIANT", assignmentSetId: bucket.profile.assignment.assignmentSetId, assignmentRevision: bucket.profile.assignment.assignmentRevision },
    locationGroupId: locationGroup.locationGroupId, locationGroupRevision: locationGroup.revision, zoneId: selectedZone?.zone.zoneId ?? "unmatched", zoneRevision: selectedZone?.zone.revision ?? 0, methodDefinitions: methods, failurePolicy: bucket.profile.failurePolicy };
  const ratedFactsHash = revision("drated_v1", { origin, destination: providerDestination(bucket.destination), packageSnapshot, currencyCode: params.context.currencyCode, channelCode: params.context.channelCode, localeCode: params.context.localeCode, targetCheckoutVersion: params.context.targetCheckoutVersion,
    physicalRevisions: bucket.lines.map((line) => facts.get(line.lineId)?.physicalRevision), pricingRevision: params.preliminary.revision });
  return { groupId, destination: bucket.destination, profile: bucket.profile, lines: bucket.lines, origin, package: packageSnapshot, ratedFactsHash, ratePlanRevision: revision("drpgroup_v1", [groupId, ratedFactsHash]), eligibility, issues };
}

function manualCandidate(params: Delivery.CalculateCheckoutDeliveryOptionsParams, plan: GroupPlan, method: Delivery.DeliveryMethodDefinitionSnapshot & { rateSource: Extract<Delivery.DeliveryMethodRateSource, { type: "MANUAL" }> }, secret: string): DeliveryOptionBindingCandidate {
  const handle = optionHandle(secret, [params.context.storeId, params.context.checkoutId, plan.groupId, plan.profile.profileId, method.methodDefinitionId, "MANUAL", method.revision, method.rateSource.price, plan.ratedFactsHash]);
  const option = { source: "MANUAL" as const, handle, profileId: plan.profile.profileId, methodDefinitionId: method.methodDefinitionId, code: method.code, title: method.title, description: method.description,
    deliveryMethodType: method.deliveryMethodType, cost: method.rateSource.price, estimatedMinDeliveryAt: null, estimatedMaxDeliveryAt: null, phoneRequired: false, customerInputContract: null, publicData: {}, carrier: null };
  return { option, binding: { source: "MANUAL", optionHandle: handle, checkoutId: params.context.checkoutId, basedOnCheckoutVersion: params.context.expectedCheckoutVersion,
    targetCheckoutVersion: params.context.targetCheckoutVersion, groupId: plan.groupId, profileId: plan.profile.profileId, methodDefinitionId: method.methodDefinitionId,
    preliminaryRevision: params.preliminary.revision, ratePlanRevision: plan.ratePlanRevision, eligibilityRevision: plan.eligibility.eligibilityRevision,
    customizationRevision: "pending", customizationPolicyRevision: "pending", ratedFactsHash: plan.ratedFactsHash, customerInputContract: null,
    expiresAt: params.context.deadlineAt, manualRateRevision: method.revision } };
}

function carrierCandidate(params: Delivery.CalculateCheckoutDeliveryOptionsParams, plan: GroupPlan, method: Delivery.DeliveryMethodDefinitionSnapshot & { rateSource: Extract<Delivery.DeliveryMethodRateSource, { type: "CARRIER_SERVICE" }> }, account: Delivery.DeliveryProviderAccountSnapshot, route: Delivery.DeliveryProviderRouteSnapshot & { operation: "quoteRates" }, quoteRevision: string, rate: Delivery.DeliveryCarrierServiceRate, secret: string): DeliveryOptionBindingCandidate {
  const contract = rate.customerInputContract === null ? null : { ...rate.customerInputContract, schemaHash: revision("dschema_v1", rate.customerInputContract.schema), schemaPolicyRevision: "delivery-schema-policy-v1" };
  const handle = optionHandle(secret, [params.context.storeId, params.context.checkoutId, plan.groupId, plan.profile.profileId, method.methodDefinitionId, "CARRIER_SERVICE", account.providerAccountId, rate.serviceCode, rate.cost, rate.estimatedMinDeliveryAt, rate.estimatedMaxDeliveryAt, contract?.schemaHash, plan.ratedFactsHash]);
  const option = { source: "CARRIER_SERVICE" as const, handle, profileId: plan.profile.profileId, methodDefinitionId: method.methodDefinitionId, code: rate.serviceCode, title: rate.serviceName, description: rate.description,
    deliveryMethodType: method.deliveryMethodType, cost: rate.cost, estimatedMinDeliveryAt: rate.estimatedMinDeliveryAt, estimatedMaxDeliveryAt: rate.estimatedMaxDeliveryAt,
    phoneRequired: rate.phoneRequired, customerInputContract: contract, publicData: projectPublicData(rate.publicData), carrier: { code: account.providerCode } };
  return { option, binding: { source: "CARRIER_SERVICE", optionHandle: handle, checkoutId: params.context.checkoutId, basedOnCheckoutVersion: params.context.expectedCheckoutVersion,
    targetCheckoutVersion: params.context.targetCheckoutVersion, groupId: plan.groupId, profileId: plan.profile.profileId, methodDefinitionId: method.methodDefinitionId,
    preliminaryRevision: params.preliminary.revision, ratePlanRevision: plan.ratePlanRevision, eligibilityRevision: plan.eligibility.eligibilityRevision,
    customizationRevision: "pending", customizationPolicyRevision: "pending", ratedFactsHash: plan.ratedFactsHash, customerInputContract: contract,
    expiresAt: params.context.deadlineAt, carrierServiceAccountId: account.providerAccountId, carrierCode: account.providerCode, serviceCode: rate.serviceCode,
    quoteRoute: route, carrierServiceConfigurationRevision: account.capabilityStates.carrierService?.configurationRevision ?? "unknown", executionPolicyRevision: "delivery-provider-policy-v1",
    customerInputSchemaPolicyRevision: "delivery-schema-policy-v1", publicDataPolicyRevision: "delivery-public-data-policy-v1", quoteRevision } };
}

function providerDestination(destination: Delivery.DeliveryCheckoutDestinationIntent): Delivery.DeliveryProviderDestination { return { destinationId: destination.destinationId, address: { countryCode: destination.address.countryCode, provinceCode: destination.address.provinceCode, provinceName: destination.address.provinceName,
  city: destination.address.city, postalCode: destination.address.postalCode, addressLine1: destination.address.address1, addressLine2: destination.address.address2 } }; }
function customizationInput(params: Delivery.CalculateCheckoutDeliveryOptionsParams, plans: readonly GroupPlan[], results: readonly { group: Delivery.DeliveryCheckoutGroup }[]): Delivery.DeliveryCustomizationFunctionInput {
  const buyer = params.context.buyerEligibility;
  return { schemaVersion: 1, executionId: params.context.executionId, storeId: params.context.storeId, checkoutId: params.context.checkoutId,
    checkoutVersion: params.context.expectedCheckoutVersion, currencyCode: params.context.currencyCode, localeCode: params.context.localeCode,
    channelCode: params.context.channelCode, effectiveAt: params.context.effectiveAt,
    buyer: { customerId: buyer?.customerId ?? null, isAuthenticated: buyer?.customerId !== null && buyer?.customerId !== undefined,
      segmentIds: buyer?.segmentIds ?? [], companyId: buyer?.companyId ?? null }, cartAttributes: params.cartAttributes,
    groups: plans.map((plan) => ({ groupId: plan.groupId, destination: { countryCode: plan.destination.address.countryCode,
      provinceCode: plan.destination.address.provinceCode, city: plan.destination.address.city, postalCode: plan.destination.address.postalCode,
      addressLine1: plan.destination.address.address1 }, lines: plan.lines.map((line) => ({ lineId: line.lineId, variantId: line.merchandise.variantId,
        quantity: line.quantity, subtotal: line.total, attributes: {} })), options: results.find((entry) => entry.group.groupId === plan.groupId)?.group.options ?? [] })) };
}
function flatten(lines: readonly QuotedLine[]): QuotedLine[] { return lines.flatMap((line) => [line, ...flatten(line.children)]); }
function issue(groupId: string, accountId: string | null, code: string, message: string, retryable: boolean): Delivery.DeliveryCheckoutIssue { return { severity: "ERROR", code, message, groupId, carrierServiceAccountId: accountId, retryable }; }
function warning(groupId: string, accountId: string | null, code: string, message: string, retryable: boolean): Delivery.DeliveryCheckoutIssue { return { severity: "WARNING", code, message, groupId, carrierServiceAccountId: accountId, retryable }; }
function projectPublicData(value: Pricing.PricingCheckoutJsonObject): Pricing.PricingCheckoutJsonObject {
  const entries = Object.entries(value).filter(([key, child]) => !/(secret|token|password|credential|private|authorization)/i.test(key) && safePublicValue(child));
  const projected = Object.fromEntries(entries) as Pricing.PricingCheckoutJsonObject;
  return JSON.stringify(projected).length <= 32_768 ? projected : {};
}
function safePublicValue(value: Pricing.PricingCheckoutJsonValue): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return value.length <= 2_048 && !/<\/?[a-z!][^>]*>/i.test(value);
  if (Array.isArray(value)) return value.length <= 100 && value.every(safePublicValue);
  return Object.keys(value).length <= 100 && Object.entries(value).every(([key, child]) => !/(secret|token|password|credential|private|authorization)/i.test(key) && safePublicValue(child));
}
function matchesSchema(schema: Pricing.PricingCheckoutJsonObject, value: Pricing.PricingCheckoutJsonObject | null): boolean {
  const type = typeof schema.type === "string" ? schema.type : null;
  if (type === "object") {
    if (value === null || Array.isArray(value) || typeof value !== "object") return false;
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === "string") : [];
    if (required.some((key) => !(key in value))) return false;
    const properties = schema.properties;
    if (properties && !Array.isArray(properties) && typeof properties === "object") {
      for (const [key, childSchema] of Object.entries(properties)) {
        if (!(key in value) || !isJsonObject(childSchema)) continue;
        const child = value[key]; const childType = typeof childSchema.type === "string" ? childSchema.type : null;
        if (childType === "string" && typeof child !== "string") return false;
        if (childType === "number" && typeof child !== "number") return false;
        if (childType === "integer" && (!Number.isInteger(child))) return false;
        if (childType === "boolean" && typeof child !== "boolean") return false;
        if (Array.isArray(childSchema.enum) && !childSchema.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(child))) return false;
      }
    }
  }
  return true;
}
function isJsonObject(value: Pricing.PricingCheckoutJsonValue): value is Pricing.PricingCheckoutJsonObject { return value !== null && typeof value === "object" && !Array.isArray(value); }
function withBindingRevisions(candidate: DeliveryOptionBindingCandidate, ratePlanRevision: string, eligibilityRevision: string, customizationRevision: string, customizationPolicyRevision: string): DeliveryOptionBindingCandidate {
  if (candidate.option.source === "MANUAL" && candidate.binding.source === "MANUAL") return { option: candidate.option, binding: { ...candidate.binding, ratePlanRevision, eligibilityRevision, customizationRevision, customizationPolicyRevision } };
  if (candidate.option.source === "CARRIER_SERVICE" && candidate.binding.source === "CARRIER_SERVICE") return { option: candidate.option, binding: { ...candidate.binding, ratePlanRevision, eligibilityRevision, customizationRevision, customizationPolicyRevision } };
  throw new Error("Delivery option and binding sources do not match");
}
function reset(selection: Delivery.DeliveryCheckoutOptionSelectionIntent, code: string, message: string): Delivery.DeliveryCheckoutOptionSelectionResolution { return { status: "RESET", previousOptionHandle: selection.optionHandle, customerInput: selection.customerInput, reason: { code, message } }; }
function assertRequest(params: Delivery.CalculateCheckoutDeliveryOptionsParams): void { if (params.context.targetCheckoutVersion !== params.context.expectedCheckoutVersion + 1) throw new Error("Delivery target checkout version must equal base version plus one"); if (Date.parse(params.context.deadlineAt) <= Date.now()) throw new Error("Delivery checkout deadline has expired"); }
async function deadline<T>(promise: Promise<T>, deadlineAt: string): Promise<T> { const remaining = Date.parse(deadlineAt) - Date.now(); if (remaining <= 0) throw new Error("Delivery deadline exceeded"); return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Delivery deadline exceeded")), remaining))]); }
