import { Injectable } from "@nestjs/common";
import { Action, BrokerActions, InjectBroker, type ServiceBroker, ZodSchema } from "@shopana/shared-kernel";
import { DeliveryConfigurationActionNames, type Delivery } from "@shopana/broker-types";
import { z } from "zod";
import { DeliveryProfileSetSnapshotSchema, DeliveryProfileSnapshotSchema } from "../../contracts/configuration-schemas.js";
import type { Repository } from "../../repositories/Repository.js";

const id = z.string().trim().min(1).max(512);
const saveSchema = z.object({ profile: DeliveryProfileSnapshotSchema.refine((profile) => profile.status === "INACTIVE", { message: "Only inactive profiles can be saved as drafts" }), expectedProfileRevision: z.number().int().safe().positive().nullable() }).strict();
const activateSchema = z.object({ profileSet: DeliveryProfileSetSnapshotSchema, expectedProfileSetRevision: id.nullable(), memberships: z.array(z.object({
  profileId: id, assignmentSetId: id, assignmentRevision: id, membershipType: z.enum(["VARIANT", "SELLING_PLAN_GROUP"]), resourceId: id,
  sequence: z.number().int().safe().nonnegative(),
}).strict()).max(100_000) }).strict();
const configureCustomizationSchema = z.object({ storeId: id, customizationId: id, customizationStatus: z.enum(["ACTIVE", "DISABLED"]), policyRevision: id,
  configurationRevision: id, functionBindingId: id, installationId: id, functionKey: id, configurationSnapshot: z.record(z.unknown()),
  bindingConfigurationRevision: id, routeRevision: id, precedence: z.number().int().safe(), activationSequence: z.number().int().safe().nonnegative(),
  failureMode: z.enum(["REQUIRED", "OPTIONAL"]), bindingStatus: z.enum(["ACTIVE", "DISABLED"]) }).strict();

@Injectable()
export class DeliveryConfigurationActions extends BrokerActions {
  constructor(@InjectBroker("delivery") broker: ServiceBroker, private readonly repository: Repository) { super(broker); }
  @Action(DeliveryConfigurationActionNames.saveInactiveProfile) @ZodSchema(saveSchema)
  saveInactiveDeliveryProfile(params: Delivery.SaveInactiveDeliveryProfileParams) { return this.repository.profiles.saveInactiveProfile(params); }
  @Action(DeliveryConfigurationActionNames.activateProfileSet) @ZodSchema(activateSchema)
  activateDeliveryProfileSet(params: Delivery.ActivateDeliveryProfileSetParams) { return this.repository.profiles.replaceActiveProfileSet(params); }
  @Action(DeliveryConfigurationActionNames.configureCustomization) @ZodSchema(configureCustomizationSchema)
  configureDeliveryCustomization(params: Delivery.ConfigureDeliveryCustomizationParams) { return this.repository.customizationBindings.configure(params); }
}
