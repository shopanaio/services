import { and, asc, eq } from "drizzle-orm";
import type { CommerceFunctionBindingRef } from "@shopana/function-runner";
import { revision } from "../domain/canonical.js";
import { BaseRepository } from "./BaseRepository.js";
import { customizationBindings, customizations } from "./models/index.js";
import type { Delivery } from "@shopana/broker-types";

export class CustomizationBindingRepository extends BaseRepository {
  async configure(
    input: Delivery.ConfigureDeliveryCustomizationParams,
  ): Promise<Delivery.ConfigureDeliveryCustomizationResult> {
    return this.txManager.run(async () => {
      const now = new Date().toISOString();
      await this.connection
        .insert(customizations)
        .values({
          id: input.customizationId,
          storeId: input.storeId,
          status: input.customizationStatus,
          policyRevision: input.policyRevision,
          configurationRevision: input.configurationRevision,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: customizations.id,
          set: {
            status: input.customizationStatus,
            policyRevision: input.policyRevision,
            configurationRevision: input.configurationRevision,
            updatedAt: now,
          },
        });
      await this.connection
        .insert(customizationBindings)
        .values({
          id: input.functionBindingId,
          storeId: input.storeId,
          customizationId: input.customizationId,
          installationId: input.installationId,
          functionKey: input.functionKey,
          configuration: input.configurationSnapshot,
          configurationRevision: input.bindingConfigurationRevision,
          pinnedRouteRevision: input.routeRevision,
          precedence: input.precedence,
          activationSequence: input.activationSequence,
          failureMode: input.failureMode,
          status: input.bindingStatus,
        })
        .onConflictDoUpdate({
          target: customizationBindings.id,
          set: {
            installationId: input.installationId,
            functionKey: input.functionKey,
            configuration: input.configurationSnapshot,
            configurationRevision: input.bindingConfigurationRevision,
            pinnedRouteRevision: input.routeRevision,
            precedence: input.precedence,
            activationSequence: input.activationSequence,
            failureMode: input.failureMode,
            status: input.bindingStatus,
          },
        });
      return { customizationId: input.customizationId, functionBindingId: input.functionBindingId };
    });
  }

  async listActive(storeId: string): Promise<{
    policyRevision: string;
    bindingSetRevision: string;
    bindings: readonly CommerceFunctionBindingRef[];
  }> {
    const rows = await this.connection
      .select({ binding: customizationBindings, owner: customizations })
      .from(customizationBindings)
      .innerJoin(
        customizations,
        and(
          eq(customizations.id, customizationBindings.customizationId),
          eq(customizations.storeId, customizationBindings.storeId),
        ),
      )
      .where(
        and(
          eq(customizationBindings.storeId, storeId),
          eq(customizationBindings.status, "ACTIVE"),
          eq(customizations.status, "ACTIVE"),
        ),
      )
      .orderBy(
        asc(customizationBindings.precedence),
        asc(customizationBindings.activationSequence),
        asc(customizationBindings.id),
      );
    return {
      policyRevision: revision(
        "dcustpolicy_v1",
        rows.map(({ owner }) => owner.policyRevision),
      ),
      bindingSetRevision: revision(
        "dcustbindings_v1",
        rows.map(({ binding }) => ({
          id: binding.id,
          revision: binding.configurationRevision,
          routeRevision: binding.pinnedRouteRevision,
          precedence: binding.precedence,
          sequence: binding.activationSequence,
        })),
      ),
      bindings: rows.map(({ binding }) => ({
        functionBindingId: binding.id,
        installationId: binding.installationId,
        functionKey: binding.functionKey,
        owner: {
          service: "delivery",
          resourceType: "delivery_customization",
          resourceId: binding.customizationId,
        },
        configurationRevision: binding.configurationRevision,
        configurationSnapshot: binding.configuration,
        routeRevision: binding.pinnedRouteRevision,
        precedence: binding.precedence,
        activationSequence: binding.activationSequence,
        failureMode: binding.failureMode as CommerceFunctionBindingRef["failureMode"],
      })),
    };
  }
}
