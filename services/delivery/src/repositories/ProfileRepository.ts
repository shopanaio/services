import { and, eq } from "drizzle-orm";
import type { Delivery } from "@shopana/broker-types";
import type {
  DeliveryProfileAssignmentsPort,
  DeliveryProfilesPort,
} from "../contracts/configuration.js";
import { BaseRepository } from "./BaseRepository.js";
import { profileAssignmentMemberships, profiles, profileSets } from "./models/index.js";

export class ProfileRepository
  extends BaseRepository
  implements DeliveryProfilesPort, DeliveryProfileAssignmentsPort
{
  async listActiveForStore(storeId: string) {
    const [row] = await this.connection
      .select({ snapshot: profileSets.snapshot })
      .from(profileSets)
      .where(eq(profileSets.storeId, storeId))
      .limit(1);
    if (!row) throw new Error(`No active delivery profile set for store ${storeId}`);
    return row.snapshot;
  }

  async getById(storeId: string, profileId: string) {
    const [row] = await this.connection
      .select({ snapshot: profiles.snapshot })
      .from(profiles)
      .where(and(eq(profiles.storeId, storeId), eq(profiles.id, profileId)))
      .limit(1);
    return row?.snapshot ?? null;
  }

  async saveInactiveProfile(input: {
    profile: Delivery.DeliveryProfileSnapshot & { status: "INACTIVE" };
  }) {
    await this.connection
      .insert(profiles)
      .values({
        id: input.profile.profileId,
        storeId: input.profile.storeId,
        revision: input.profile.revision,
        status: input.profile.status,
        snapshot: input.profile,
        createdAt: input.profile.createdAt,
        updatedAt: input.profile.updatedAt,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          revision: input.profile.revision,
          status: input.profile.status,
          snapshot: input.profile,
          updatedAt: input.profile.updatedAt,
        },
      });
    return { status: "SAVED" as const, profile: input.profile };
  }

  async replaceActiveProfileSet(input: {
    profileSet: Delivery.DeliveryProfileSetSnapshot;
    memberships: readonly Delivery.DeliveryProfileAssignmentMembershipInput[];
  }) {
    validateProfileSet(input.profileSet);
    validateMemberships(input.profileSet, input.memberships);
    return this.txManager.run(async () => {
      const [currentRow] = await this.connection
        .select({ snapshot: profileSets.snapshot })
        .from(profileSets)
        .where(eq(profileSets.storeId, input.profileSet.storeId))
        .limit(1);
      const id = currentRow ? undefined : await this.generateUuidV7();
      await this.connection
        .insert(profileSets)
        .values({
          id: id ?? input.profileSet.profiles[0].profileId,
          storeId: input.profileSet.storeId,
          revision: input.profileSet.revision,
          currencyCode: input.profileSet.currencyCode,
          snapshot: input.profileSet,
        })
        .onConflictDoUpdate({
          target: profileSets.storeId,
          set: {
            revision: input.profileSet.revision,
            currencyCode: input.profileSet.currencyCode,
            snapshot: input.profileSet,
            activatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      await this.connection
        .delete(profileAssignmentMemberships)
        .where(eq(profileAssignmentMemberships.storeId, input.profileSet.storeId));
      for (const membership of input.memberships) {
        await this.connection.insert(profileAssignmentMemberships).values({
          id: await this.generateUuidV7(),
          storeId: input.profileSet.storeId,
          profileSetRevision: input.profileSet.revision,
          profileId: membership.profileId,
          assignmentSetId: membership.assignmentSetId,
          membershipType: membership.membershipType,
          resourceId: membership.resourceId,
          assignmentRevision: membership.assignmentRevision,
          sequence: membership.sequence,
        });
      }
      for (const profile of input.profileSet.profiles) {
        await this.connection
          .insert(profiles)
          .values({
            id: profile.profileId,
            storeId: profile.storeId,
            revision: profile.revision,
            status: "ACTIVE",
            snapshot: profile,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: {
              revision: profile.revision,
              status: "ACTIVE",
              snapshot: profile,
              updatedAt: profile.updatedAt,
            },
          });
      }
      return { status: "SAVED" as const, profileSet: input.profileSet };
    });
  }

  async resolve(input: {
    storeId: string;
    variantId: string;
    sellingPlanGroupId: string | null;
    activeProfileSetRevision: string;
  }) {
    const active = await this.listActiveForStore(input.storeId);
    if (active.revision !== input.activeProfileSetRevision) {
      return {
        status: "PROFILE_SET_REVISION_MISMATCH" as const,
        currentProfileSetRevision: active.revision,
      };
    }
    const resources =
      input.sellingPlanGroupId === null
        ? [{ type: "VARIANT", id: input.variantId } as const]
        : [
            { type: "SELLING_PLAN_GROUP", id: input.sellingPlanGroupId } as const,
            { type: "VARIANT", id: input.variantId } as const,
          ];
    for (const resource of resources) {
      const [row] = await this.connection
        .select()
        .from(profileAssignmentMemberships)
        .where(
          and(
            eq(profileAssignmentMemberships.storeId, input.storeId),
            eq(profileAssignmentMemberships.profileSetRevision, active.revision),
            eq(profileAssignmentMemberships.membershipType, resource.type),
            eq(profileAssignmentMemberships.resourceId, resource.id),
          ),
        )
        .limit(1);
      if (row)
        return {
          status: "MATCHED" as const,
          profileId: row.profileId,
          assignmentSetId: row.assignmentSetId,
          assignmentRevision: row.assignmentRevision,
          matchedBy: resource.type === "VARIANT" ? ("VARIANT" as const) : ("SELLING_PLAN" as const),
        };
    }
    const defaultProfile = active.profiles.find((profile) => profile.isDefault)!;
    return {
      status: "MATCHED" as const,
      profileId: defaultProfile.profileId,
      assignmentSetId: null,
      assignmentRevision: null,
      matchedBy: "DEFAULT" as const,
    };
  }
}

function validateMemberships(
  profileSet: Delivery.DeliveryProfileSetSnapshot,
  memberships: readonly Delivery.DeliveryProfileAssignmentMembershipInput[],
): void {
  const profileIds = new Set(
    profileSet.profiles.filter((profile) => !profile.isDefault).map((profile) => profile.profileId),
  );
  const seen = new Set<string>();
  for (const membership of memberships) {
    if (!profileIds.has(membership.profileId))
      throw new Error("Delivery assignment membership references an inactive or default profile");
    const profile = profileSet.profiles.find(
      (candidate) => candidate.profileId === membership.profileId,
    )!;
    if (
      profile.assignment.scope !== "ASSIGNED" ||
      profile.assignment.assignmentSetId !== membership.assignmentSetId ||
      profile.assignment.assignmentRevision !== membership.assignmentRevision
    )
      throw new Error("Delivery assignment membership does not match its profile snapshot");
    const key = `${membership.membershipType}:${membership.resourceId}`;
    if (seen.has(key)) throw new Error("Active delivery profile assignments overlap");
    seen.add(key);
  }
}

function validateProfileSet(profileSet: Delivery.DeliveryProfileSetSnapshot): void {
  if (profileSet.profiles.filter((profile) => profile.isDefault).length !== 1)
    throw new Error("Active delivery profile set requires exactly one default profile");
  const ids = new Set<string>();
  for (const profile of profileSet.profiles) {
    if (profile.storeId !== profileSet.storeId) throw new Error("Delivery profile store mismatch");
    if (ids.has(profile.profileId)) throw new Error("Duplicate delivery profile ID");
    ids.add(profile.profileId);
    for (const group of profile.locationGroups) {
      if (ids.has(group.locationGroupId)) throw new Error("Duplicate delivery location group ID");
      ids.add(group.locationGroupId);
      for (const { zone, methods } of group.zones) {
        if (ids.has(zone.zoneId)) throw new Error("Duplicate delivery zone ID");
        ids.add(zone.zoneId);
        for (const method of methods) {
          if (ids.has(method.methodDefinitionId)) throw new Error("Duplicate delivery method ID");
          ids.add(method.methodDefinitionId);
          if (
            method.rateSource.type === "MANUAL" &&
            method.rateSource.price.currencyCode !== profileSet.currencyCode
          )
            throw new Error("Manual delivery rate currency mismatch");
        }
      }
    }
  }
}
