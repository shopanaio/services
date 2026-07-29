import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  ne,
} from "drizzle-orm";
import type { AppManifest } from "@shopana/app-sdk";
import type { TransactionManager } from "@shopana/shared-kernel";
import type {
  AppInstallationRecord,
  CapabilityRouteTarget,
  ResolvedCapabilityRoute,
} from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appBindingAssignments,
  appBindings,
  appInstallations,
} from "../models/index.js";
import { isBroadcastStoreRoute } from "./capability-route-policy.js";

export interface AppCapabilityBindingRecord {
  readonly id: string;
  readonly installationId: string;
  readonly storeId: string;
  readonly capability: string;
  readonly assignmentMode: "store" | "resource";
  readonly operation: string;
  readonly targetAppCode: string;
  readonly targetAction: string;
  readonly status: "active" | "inactive" | "maintenance" | "deprecated";
  readonly precedence: number | null;
  readonly assignmentStatus: "active" | "disabled" | null;
}

export class AppCapabilityRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async listByInstallation(
    installationId: string,
  ): Promise<AppCapabilityBindingRecord[]> {
    return this.connection
      .select({
        id: appBindings.id,
        installationId: appBindings.installationId,
        storeId: appBindings.storeId,
        capability: appBindings.capability,
        assignmentMode: appBindings.assignmentMode,
        operation: appBindings.operationContract,
        targetAppCode: appBindings.targetAppCode,
        targetAction: appBindings.targetAction,
        status: appBindings.status,
        precedence: appBindingAssignments.precedence,
        assignmentStatus: appBindingAssignments.status,
      })
      .from(appBindings)
      .leftJoin(
        appBindingAssignments,
        eq(appBindingAssignments.slotId, appBindings.id),
      )
      .where(eq(appBindings.installationId, installationId))
      .orderBy(
        asc(appBindings.capability),
        asc(appBindings.operationContract),
      );
  }

  async listByInstallationForStore(
    installationId: string,
  ): Promise<AppCapabilityBindingRecord[]> {
    return this.connection
      .select({
        id: appBindings.id,
        installationId: appBindings.installationId,
        storeId: appBindings.storeId,
        capability: appBindings.capability,
        assignmentMode: appBindings.assignmentMode,
        operation: appBindings.operationContract,
        targetAppCode: appBindings.targetAppCode,
        targetAction: appBindings.targetAction,
        status: appBindings.status,
        precedence: appBindingAssignments.precedence,
        assignmentStatus: appBindingAssignments.status,
      })
      .from(appBindings)
      .leftJoin(
        appBindingAssignments,
        eq(appBindingAssignments.slotId, appBindings.id),
      )
      .where(
        and(
          eq(appBindings.storeId, this.storeId),
          eq(appBindings.installationId, installationId),
        ),
      )
      .orderBy(
        asc(appBindings.capability),
        asc(appBindings.operationContract),
      );
  }

  async listByInstallationIdsForStore(
    installationIds: readonly string[],
  ): Promise<AppCapabilityBindingRecord[]> {
    if (installationIds.length === 0) return [];
    return this.connection
      .select({
        id: appBindings.id,
        installationId: appBindings.installationId,
        storeId: appBindings.storeId,
        capability: appBindings.capability,
        assignmentMode: appBindings.assignmentMode,
        operation: appBindings.operationContract,
        targetAppCode: appBindings.targetAppCode,
        targetAction: appBindings.targetAction,
        status: appBindings.status,
        precedence: appBindingAssignments.precedence,
        assignmentStatus: appBindingAssignments.status,
      })
      .from(appBindings)
      .leftJoin(
        appBindingAssignments,
        eq(appBindingAssignments.slotId, appBindings.id),
      )
      .where(
        and(
          eq(appBindings.storeId, this.storeId),
          inArray(
            appBindings.installationId,
            [...new Set(installationIds)],
          ),
        ),
      )
      .orderBy(
        asc(appBindings.installationId),
        asc(appBindings.capability),
        asc(appBindings.operationContract),
      );
  }

  async findByIdForStore(
    id: string,
  ): Promise<AppCapabilityBindingRecord | null> {
    const rows = await this.connection
      .select({
        id: appBindings.id,
        installationId: appBindings.installationId,
        storeId: appBindings.storeId,
        capability: appBindings.capability,
        assignmentMode: appBindings.assignmentMode,
        operation: appBindings.operationContract,
        targetAppCode: appBindings.targetAppCode,
        targetAction: appBindings.targetAction,
        status: appBindings.status,
        precedence: appBindingAssignments.precedence,
        assignmentStatus: appBindingAssignments.status,
      })
      .from(appBindings)
      .leftJoin(
        appBindingAssignments,
        eq(appBindingAssignments.slotId, appBindings.id),
      )
      .where(
        and(
          eq(appBindings.storeId, this.storeId),
          eq(appBindings.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getByIdsForStore(
    ids: readonly string[],
  ): Promise<AppCapabilityBindingRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.connection
      .select({
        id: appBindings.id,
        installationId: appBindings.installationId,
        storeId: appBindings.storeId,
        capability: appBindings.capability,
        assignmentMode: appBindings.assignmentMode,
        operation: appBindings.operationContract,
        targetAppCode: appBindings.targetAppCode,
        targetAction: appBindings.targetAction,
        status: appBindings.status,
        precedence: appBindingAssignments.precedence,
        assignmentStatus: appBindingAssignments.status,
      })
      .from(appBindings)
      .leftJoin(
        appBindingAssignments,
        eq(appBindingAssignments.slotId, appBindings.id),
      )
      .where(
        and(
          eq(appBindings.storeId, this.storeId),
          inArray(appBindings.id, [...new Set(ids)]),
        ),
      );
  }

  async resolveRoute(
    storeId: string,
    capability: string,
    operation: string,
    target?: CapabilityRouteTarget,
  ): Promise<ResolvedCapabilityRoute | null> {
    const assignmentTarget = target ?? {
      aggregate: "apps",
      aggregateId: capabilityRouteKey(capability, operation),
      domain: capability,
    };
    const assignmentMode = target ? "resource" : "store";
    const rows = await this.connection
      .select({
        capabilityRouteId: appBindings.id,
        installationId: appInstallations.id,
        appCode: appInstallations.appCode,
        appVersion: appInstallations.installedVersion,
        organizationId: appInstallations.organizationId,
        storeId: appInstallations.storeId,
        capability: appBindings.capability,
        operation: appBindings.operationContract,
        targetAction: appBindings.targetAction,
      })
      .from(appBindingAssignments)
      .innerJoin(
        appBindings,
        eq(appBindings.id, appBindingAssignments.slotId),
      )
      .innerJoin(
        appInstallations,
        eq(appInstallations.id, appBindings.installationId),
      )
      .where(
        and(
          eq(appBindingAssignments.storeId, storeId),
          eq(
            appBindingAssignments.aggregate,
            assignmentTarget.aggregate,
          ),
          eq(
            appBindingAssignments.aggregateId,
            assignmentTarget.aggregateId,
          ),
          eq(appBindingAssignments.domain, assignmentTarget.domain),
          eq(appBindingAssignments.status, "active"),
          eq(appBindings.status, "active"),
          eq(appBindings.assignmentMode, assignmentMode),
          eq(appBindings.capability, capability),
          eq(appBindings.operationContract, operation),
          eq(appInstallations.status, "ACTIVE"),
          isNotNull(appBindings.targetAppCode),
          isNotNull(appBindings.targetAction),
        ),
      )
      .orderBy(
        asc(appBindingAssignments.precedence),
        desc(appBindingAssignments.updatedAt),
      )
      .limit(1);
    const row = rows[0];
    if (!row || !row.appVersion) {
      return null;
    }
    return {
      ...row,
      appVersion: row.appVersion,
      routeRevision: capabilityRouteRevision({
        capabilityRouteId: row.capabilityRouteId,
        appCode: row.appCode,
        appVersion: row.appVersion,
        capability: row.capability,
        operation: row.operation,
        targetAction: row.targetAction,
      }),
    };
  }

  async listActiveStoreRoutes(
    storeId: string,
    capability: string,
    operation: string,
  ): Promise<ResolvedCapabilityRoute[]> {
    const rows = await this.connection
      .select({
        capabilityRouteId: appBindings.id,
        installationId: appInstallations.id,
        appCode: appInstallations.appCode,
        appVersion: appInstallations.installedVersion,
        organizationId: appInstallations.organizationId,
        storeId: appInstallations.storeId,
        capability: appBindings.capability,
        operation: appBindings.operationContract,
        targetAction: appBindings.targetAction,
      })
      .from(appBindingAssignments)
      .innerJoin(
        appBindings,
        eq(appBindings.id, appBindingAssignments.slotId),
      )
      .innerJoin(
        appInstallations,
        eq(appInstallations.id, appBindings.installationId),
      )
      .where(
        and(
          eq(appBindingAssignments.storeId, storeId),
          eq(appBindingAssignments.aggregate, "apps"),
          eq(
            appBindingAssignments.aggregateId,
            capabilityRouteKey(capability, operation),
          ),
          eq(appBindingAssignments.domain, capability),
          eq(appBindingAssignments.status, "active"),
          eq(appBindings.storeId, storeId),
          eq(appBindings.assignmentMode, "store"),
          eq(appBindings.capability, capability),
          eq(appBindings.operationContract, operation),
          eq(appBindings.status, "active"),
          eq(appInstallations.status, "ACTIVE"),
          isNotNull(appBindings.targetAppCode),
          isNotNull(appBindings.targetAction),
        ),
      )
      .orderBy(
        asc(appBindingAssignments.precedence),
        asc(appInstallations.appCode),
        asc(appInstallations.id),
        asc(appBindings.id),
      );
    return rows.flatMap((row) =>
      row.appVersion
        ? [
            {
              ...row,
              appVersion: row.appVersion,
              routeRevision: capabilityRouteRevision({
                capabilityRouteId: row.capabilityRouteId,
                appCode: row.appCode,
                appVersion: row.appVersion,
                capability: row.capability,
                operation: row.operation,
                targetAction: row.targetAction,
              }),
            },
          ]
        : [],
    );
  }

  async resolveActiveStoreRouteForInstallation(
    storeId: string,
    capability: string,
    operation: string,
    installationId: string,
  ): Promise<ResolvedCapabilityRoute | null> {
    const routes = await this.listActiveStoreRoutes(
      storeId,
      capability,
      operation,
    );
    return (
      routes.find((route) => route.installationId === installationId) ??
      null
    );
  }

  async assignResource(input: {
    readonly storeId: string;
    readonly installationId: string;
    readonly capability: string;
    readonly target: CapabilityRouteTarget;
    readonly precedence: number;
  }): Promise<string[]> {
    const slots = await this.connection
      .select({ id: appBindings.id })
      .from(appBindings)
      .innerJoin(
        appInstallations,
        eq(appInstallations.id, appBindings.installationId),
      )
      .where(
        and(
          eq(appBindings.storeId, input.storeId),
          eq(appBindings.installationId, input.installationId),
          eq(appBindings.capability, input.capability),
          eq(appBindings.assignmentMode, "resource"),
          eq(appBindings.status, "active"),
          eq(appInstallations.status, "ACTIVE"),
        ),
      );
    if (slots.length === 0) {
      throw new Error(
        `No active resource-scoped slots for capability "${input.capability}"`,
      );
    }

    const assignmentIds: string[] = [];
    for (const slot of slots) {
      const rows = await this.connection
        .insert(appBindingAssignments)
        .values({
          storeId: input.storeId,
          aggregate: input.target.aggregate,
          aggregateId: input.target.aggregateId,
          slotId: slot.id,
          domain: input.target.domain,
          precedence: input.precedence,
          status: "active",
        })
        .onConflictDoUpdate({
          target: [
            appBindingAssignments.storeId,
            appBindingAssignments.aggregate,
            appBindingAssignments.aggregateId,
            appBindingAssignments.domain,
            appBindingAssignments.slotId,
          ],
          set: {
            precedence: input.precedence,
            status: "active",
            updatedAt: new Date().toISOString(),
          },
        })
        .returning({ id: appBindingAssignments.id });
      if (rows[0]) {
        assignmentIds.push(rows[0].id);
      }
    }
    return assignmentIds;
  }

  async unassignResource(input: {
    readonly storeId: string;
    readonly installationId: string;
    readonly capability: string;
    readonly target: CapabilityRouteTarget;
  }): Promise<number> {
    const slots = await this.connection
      .select({ id: appBindings.id })
      .from(appBindings)
      .where(
        and(
          eq(appBindings.storeId, input.storeId),
          eq(appBindings.installationId, input.installationId),
          eq(appBindings.capability, input.capability),
          eq(appBindings.assignmentMode, "resource"),
        ),
      );
    if (slots.length === 0) {
      return 0;
    }
    const removed = await this.connection
      .delete(appBindingAssignments)
      .where(
        and(
          eq(appBindingAssignments.storeId, input.storeId),
          eq(
            appBindingAssignments.aggregate,
            input.target.aggregate,
          ),
          eq(
            appBindingAssignments.aggregateId,
            input.target.aggregateId,
          ),
          eq(appBindingAssignments.domain, input.target.domain),
          inArray(
            appBindingAssignments.slotId,
            slots.map((slot) => slot.id),
          ),
        ),
      )
      .returning({ id: appBindingAssignments.id });
    return removed.length;
  }

  async sync(
    installation: AppInstallationRecord,
    manifest: AppManifest,
  ): Promise<void> {
    const declaredRoutes = new Set<string>();
    for (const capability of manifest.capabilities) {
      for (const [operation, targetAction] of Object.entries(
        capability.operations,
      )) {
        const assignmentMode =
          capability.assignmentMode ?? "store";
        const routeKey = capabilityRouteKey(capability.key, operation);
        declaredRoutes.add(routeKey);
        const currentRows = await this.connection
          .select()
          .from(appBindings)
          .where(
            and(
              eq(appBindings.installationId, installation.id),
              eq(appBindings.capability, capability.key),
              eq(appBindings.operationContract, operation),
            ),
          )
          .limit(1);
        const current = currentRows[0];
        let slotId: string;

        if (current) {
          slotId = current.id;
          if (current.assignmentMode !== assignmentMode) {
            await this.connection
              .delete(appBindingAssignments)
              .where(eq(appBindingAssignments.slotId, slotId));
          }
          await this.connection
            .update(appBindings)
            .set({
              status: "active",
              assignmentMode,
              targetAppCode: manifest.code,
              targetAction,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(appBindings.id, slotId));
        } else {
          const rows = await this.connection
            .insert(appBindings)
            .values({
              storeId: installation.storeId,
              status: "active",
              installationId: installation.id,
              capability: capability.key,
              assignmentMode,
              operationContract: operation,
              targetAppCode: manifest.code,
              targetAction,
            })
            .returning({ id: appBindings.id });
          if (!rows[0]) {
            throw new Error("App capability slot was not created");
          }
          slotId = rows[0].id;
        }

        if (assignmentMode === "resource") {
          continue;
        }

        const assignmentScope = and(
          eq(appBindingAssignments.storeId, installation.storeId),
          eq(appBindingAssignments.aggregate, "apps"),
          eq(appBindingAssignments.aggregateId, routeKey),
          eq(appBindingAssignments.domain, capability.key),
        );
        if (!isBroadcastStoreRoute(capability.key, operation)) {
          await this.connection
            .update(appBindingAssignments)
            .set({
              status: "disabled",
              updatedAt: new Date().toISOString(),
            })
            .where(
              and(
                assignmentScope,
                ne(appBindingAssignments.slotId, slotId),
              ),
            );
        }

        const assignmentRows = await this.connection
          .select({ id: appBindingAssignments.id })
          .from(appBindingAssignments)
          .where(
            and(
              assignmentScope,
              eq(appBindingAssignments.slotId, slotId),
            ),
          )
          .limit(1);
        if (assignmentRows[0]) {
          await this.connection
            .update(appBindingAssignments)
            .set({
              status: "active",
              precedence: 0,
              updatedAt: new Date().toISOString(),
            })
            .where(
              eq(
                appBindingAssignments.id,
                assignmentRows[0].id,
              ),
            );
        } else {
          await this.connection.insert(appBindingAssignments).values({
            storeId: installation.storeId,
            aggregate: "apps",
            aggregateId: routeKey,
            slotId,
            domain: capability.key,
            precedence: 0,
            status: "active",
          });
        }
      }
    }

    const existing = await this.connection
      .select({
        id: appBindings.id,
        capability: appBindings.capability,
        operation: appBindings.operationContract,
      })
      .from(appBindings)
      .where(eq(appBindings.installationId, installation.id));
    const obsoleteIds = existing
      .filter(
        (row) =>
          !declaredRoutes.has(
            capabilityRouteKey(row.capability, row.operation),
          ),
      )
      .map((row) => row.id);
    if (obsoleteIds.length > 0) {
      await this.connection
        .delete(appBindings)
        .where(inArray(appBindings.id, obsoleteIds));
    }
  }

  async setEnabled(
    installationId: string,
    enabled: boolean,
  ): Promise<void> {
    const slots = await this.connection
      .select({
        id: appBindings.id,
        storeId: appBindings.storeId,
        capability: appBindings.capability,
        operation: appBindings.operationContract,
      })
      .from(appBindings)
      .where(eq(appBindings.installationId, installationId));

    await this.connection
      .update(appBindings)
      .set({
        status: enabled ? "active" : "inactive",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appBindings.installationId, installationId));
    if (slots.length === 0) {
      return;
    }

    await this.connection
      .update(appBindingAssignments)
      .set({
        status: enabled ? "active" : "disabled",
        updatedAt: new Date().toISOString(),
      })
      .where(
        inArray(
          appBindingAssignments.slotId,
          slots.map((slot) => slot.id),
        ),
      );

    if (enabled) {
      for (const slot of slots) {
        if (isBroadcastStoreRoute(slot.capability, slot.operation)) {
          continue;
        }
        await this.connection
          .update(appBindingAssignments)
          .set({
            status: "disabled",
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(appBindingAssignments.storeId, slot.storeId),
              eq(appBindingAssignments.aggregate, "apps"),
              eq(
                appBindingAssignments.aggregateId,
                capabilityRouteKey(
                  slot.capability,
                  slot.operation,
                ),
              ),
              eq(appBindingAssignments.domain, slot.capability),
              ne(appBindingAssignments.slotId, slot.id),
            ),
          );
      }
    }
  }

  async deleteByInstallation(installationId: string): Promise<void> {
    await this.connection
      .delete(appBindings)
      .where(eq(appBindings.installationId, installationId));
  }
}

export function capabilityRouteKey(
  capability: string,
  operation: string,
): string {
  return `${capability}:${operation}`;
}

export function capabilityRouteRevision(input: {
  readonly capabilityRouteId: string;
  readonly appCode: string;
  readonly appVersion: string;
  readonly capability: string;
  readonly operation: string;
  readonly targetAction: string;
}): string {
  return createHash("sha256")
    .update(JSON.stringify([
      input.capabilityRouteId,
      input.appCode,
      input.appVersion,
      input.capability,
      input.operation,
      input.targetAction,
    ]))
    .digest("hex");
}
