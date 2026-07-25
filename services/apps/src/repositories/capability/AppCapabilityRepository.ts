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
  ResolvedCapabilityRoute,
} from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appBindingAssignments,
  appBindings,
  appInstallations,
} from "../models/index.js";

export interface AppCapabilityBindingRecord {
  readonly id: string;
  readonly installationId: string;
  readonly storeId: string;
  readonly capability: string;
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
  ): Promise<ResolvedCapabilityRoute | null> {
    const rows = await this.connection
      .select({
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
          eq(appBindings.status, "active"),
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
    };
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
          await this.connection
            .update(appBindings)
            .set({
              status: "active",
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

        const assignmentScope = and(
          eq(appBindingAssignments.storeId, installation.storeId),
          eq(appBindingAssignments.aggregate, "apps"),
          eq(appBindingAssignments.aggregateId, routeKey),
          eq(appBindingAssignments.domain, capability.key),
        );
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
