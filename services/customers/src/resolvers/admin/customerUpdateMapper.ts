import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  CustomerAddressCreateOperationInput,
  CustomerAddressPatchInput,
  CustomerConsentUpdateOperationInput,
  CustomerGroupMembershipUpdateOperationInput,
  CustomerTaxExemptionCreateOperationInput,
  CustomerTaxExemptionPatchInput,
  CustomerTaxIdentifierCreateOperationInput,
  CustomerTaxIdentifierPatchInput,
  CustomerUpdateInput,
} from "./generated/types.js";
import type {
  CustomerAddressCreateParams,
  CustomerAddressPatchParams,
  CustomerConsentAdminState,
  CustomerConsentChannel,
  CustomerConsentOptInLevel,
  CustomerTaxExemptionCreateParams,
  CustomerTaxExemptionPatchParams,
  CustomerTaxExemptionStatus,
  CustomerTaxIdentifierCreateParams,
  CustomerTaxIdentifierPatchParams,
  CustomerTaxIdentifierStatus,
  CustomerUpdateOperation,
} from "../../workflows/dto/index.js";

export interface CustomerUpdateMappedEntry {
  type: CustomerUpdateOperation["type"];
  operation?: CustomerUpdateOperation;
  errors: UserError[];
}

export interface CustomerUpdateMappingResult {
  operations: CustomerUpdateOperation[];
  entries: CustomerUpdateMappedEntry[];
  errors: UserError[];
}

export function mapCustomerUpdateInput(
  input?: CustomerUpdateInput | null,
): CustomerUpdateMappingResult {
  const entries: CustomerUpdateMappedEntry[] = [];

  if (input?.profile) {
    entries.push(
      validEntry("profileUpdate", {
        type: "profileUpdate",
        params: pickPresent(input.profile, [
          "prefix",
          "firstName",
          "middleName",
          "lastName",
          "suffix",
          "preferredLocale",
          "dateOfBirth",
          "gender",
        ]),
        meta: { fieldPrefix: ["operations", "profile"] },
      }),
    );
  }

  if (input?.contact) {
    entries.push(
      validEntry("contactUpdate", {
        type: "contactUpdate",
        params: pickPresent(input.contact, ["email", "phoneE164"]),
        meta: { fieldPrefix: ["operations", "contact"] },
      }),
    );
  }

  if (input?.company) {
    entries.push(
      validEntry("companyUpdate", {
        type: "companyUpdate",
        params: pickPresent(input.company, ["companyName", "jobTitle"]),
        meta: { fieldPrefix: ["operations", "company"] },
      }),
    );
  }

  if (input?.status) {
    entries.push(
      validEntry("statusUpdate", {
        type: "statusUpdate",
        params: {
          status: String(input.status.status) as "ACTIVE" | "BLOCKED" | "DISABLED",
          ...(hasOwn(input.status, "blockedReason")
            ? { blockedReason: input.status.blockedReason }
            : {}),
        },
        meta: { fieldPrefix: ["operations", "status"] },
      }),
    );
  }

  if (input?.note) {
    entries.push(
      validEntry("noteUpdate", {
        type: "noteUpdate",
        params: pickPresent(input.note, ["note"]),
        meta: { fieldPrefix: ["operations", "note"] },
      }),
    );
  }

  if (input?.moderation) {
    entries.push(
      validEntry("moderationUpdate", {
        type: "moderationUpdate",
        params: pickPresent(input.moderation, ["moderationNote"]),
        meta: { fieldPrefix: ["operations", "moderation"] },
      }),
    );
  }

  if (input?.addresses) entries.push(mapAddresses(input.addresses));
  if (input?.consents) entries.push(mapConsents(input.consents.set));
  if (input?.taxIdentifiers) {
    entries.push(mapTaxIdentifiers(input.taxIdentifiers));
  }
  if (input?.taxExemptions) {
    entries.push(mapTaxExemptions(input.taxExemptions));
  }
  if (input?.groups) entries.push(mapGroups(input.groups.memberships));
  if (input?.tags) entries.push(mapIdReplacement("tagUpdate", input.tags.tagIds));
  if (input?.segments) {
    entries.push(mapIdReplacement("segmentUpdate", input.segments.segmentIds));
  }

  return {
    operations: entries.flatMap((entry) => (entry.operation ? [entry.operation] : [])),
    entries,
    errors: entries.flatMap((entry) => entry.errors),
  };
}

function mapAddresses(
  input: NonNullable<CustomerUpdateInput["addresses"]>,
): CustomerUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "addresses"];
  const create = (input.create ?? []).map(mapAddressCreate);
  const update = (input.update ?? []).flatMap((item, index) => {
    const addressId = decodeId(
      item.addressId,
      GlobalIdEntity.CustomerAddress,
      [...fieldPrefix, "update", String(index), "addressId"],
      errors,
    );
    return addressId
      ? [
          {
            addressId,
            operations: pickPresent(item.operations, addressPatchFields),
          },
        ]
      : [];
  });
  const deleteIds = decodeIds(
    input.deleteIds ?? [],
    GlobalIdEntity.CustomerAddress,
    [...fieldPrefix, "deleteIds"],
    errors,
  );
  const defaults: {
    defaultShippingAddressId?: string | null;
    defaultBillingAddressId?: string | null;
  } = {};

  for (const [field, value] of [
    ["defaultShippingAddressId", input.defaultShippingAddressId],
    ["defaultBillingAddressId", input.defaultBillingAddressId],
  ] as const) {
    if (!hasOwn(input, field)) continue;
    defaults[field] = value
      ? decodeId(value, GlobalIdEntity.CustomerAddress, [...fieldPrefix, field], errors)
      : null;
  }

  const operation: CustomerUpdateOperation = {
    type: "addressUpdate",
    params: { create, update, deleteIds, ...defaults },
    meta: { fieldPrefix },
  };
  return mappedEntry(operation, errors);
}

function mapAddressCreate(input: CustomerAddressCreateOperationInput): CustomerAddressCreateParams {
  return {
    ...pickPresent(input, addressCreateOptionalFields),
    address1: input.address1,
    city: input.city,
    countryCode: input.countryCode,
  };
}

function mapConsents(
  inputs: readonly CustomerConsentUpdateOperationInput[],
): CustomerUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "consents"];
  const set = inputs.map((input, index) => {
    let evidence: Record<string, unknown> | null | undefined;
    if (hasOwn(input, "evidence")) {
      if (input.evidence === null || input.evidence === undefined) {
        evidence = input.evidence;
      } else if (isRecord(input.evidence)) {
        evidence = input.evidence;
      } else {
        errors.push({
          message: "Consent evidence must be a JSON object",
          code: "INVALID_EVIDENCE",
          field: [...fieldPrefix, "set", String(index), "evidence"],
        });
      }
    }
    return {
      channel: String(input.channel) as CustomerConsentChannel,
      state: String(input.state) as CustomerConsentAdminState,
      ...(hasOwn(input, "optInLevel")
        ? {
            optInLevel: input.optInLevel
              ? (String(input.optInLevel) as CustomerConsentOptInLevel)
              : input.optInLevel,
          }
        : {}),
      contactPoint: input.contactPoint,
      ...(hasOwn(input, "sourceLocationId") ? { sourceLocationId: input.sourceLocationId } : {}),
      ...(hasOwn(input, "evidence") ? { evidence } : {}),
    };
  });
  return mappedEntry(
    {
      type: "consentUpdate",
      params: { set },
      meta: { fieldPrefix },
    },
    errors,
  );
}

function mapTaxIdentifiers(
  input: NonNullable<CustomerUpdateInput["taxIdentifiers"]>,
): CustomerUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "taxIdentifiers"];
  const create = (input.create ?? []).map(mapTaxIdentifierCreate);
  const update = (input.update ?? []).flatMap((item, index) => {
    const taxIdentifierId = decodeId(
      item.taxIdentifierId,
      GlobalIdEntity.CustomerTaxIdentifier,
      [...fieldPrefix, "update", String(index), "taxIdentifierId"],
      errors,
    );
    return taxIdentifierId
      ? [
          {
            taxIdentifierId,
            operations: mapTaxIdentifierPatch(item.operations),
          },
        ]
      : [];
  });
  const deleteIds = decodeIds(
    input.deleteIds ?? [],
    GlobalIdEntity.CustomerTaxIdentifier,
    [...fieldPrefix, "deleteIds"],
    errors,
  );
  return mappedEntry(
    {
      type: "taxIdentifierUpdate",
      params: { create, update, deleteIds },
      meta: { fieldPrefix },
    },
    errors,
  );
}

function mapTaxIdentifierCreate(
  input: CustomerTaxIdentifierCreateOperationInput,
): CustomerTaxIdentifierCreateParams {
  return {
    ...mapTaxIdentifierPatch(input),
    identifierType: input.identifierType,
    value: input.value,
  };
}

function mapTaxIdentifierPatch(
  input: CustomerTaxIdentifierPatchInput | CustomerTaxIdentifierCreateOperationInput,
): CustomerTaxIdentifierPatchParams {
  const result = pickPresent(input, [
    "identifierType",
    "countryCode",
    "value",
    "isPrimary",
    "validFrom",
    "validTo",
  ]) as CustomerTaxIdentifierPatchParams;
  if (hasOwn(input, "status")) {
    result.status = input.status
      ? (String(input.status) as CustomerTaxIdentifierStatus)
      : input.status;
  }
  return result;
}

function mapTaxExemptions(
  input: NonNullable<CustomerUpdateInput["taxExemptions"]>,
): CustomerUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "taxExemptions"];
  const create = (input.create ?? []).flatMap((item, index) => {
    const mapped = mapTaxExemptionCreate(item, [...fieldPrefix, "create", String(index)], errors);
    return mapped ? [mapped] : [];
  });
  const update = (input.update ?? []).flatMap((item, index) => {
    const itemPrefix = [...fieldPrefix, "update", String(index)];
    const taxExemptionId = decodeId(
      item.taxExemptionId,
      GlobalIdEntity.CustomerTaxExemption,
      [...itemPrefix, "taxExemptionId"],
      errors,
    );
    const operations = mapTaxExemptionPatch(item.operations, [...itemPrefix, "operations"], errors);
    return taxExemptionId ? [{ taxExemptionId, operations }] : [];
  });
  const deleteIds = decodeIds(
    input.deleteIds ?? [],
    GlobalIdEntity.CustomerTaxExemption,
    [...fieldPrefix, "deleteIds"],
    errors,
  );
  return mappedEntry(
    {
      type: "taxExemptionUpdate",
      params: { create, update, deleteIds },
      meta: { fieldPrefix },
    },
    errors,
  );
}

function mapTaxExemptionCreate(
  input: CustomerTaxExemptionCreateOperationInput,
  fieldPrefix: string[],
  errors: UserError[],
): CustomerTaxExemptionCreateParams | undefined {
  const patch = mapTaxExemptionPatch(input, fieldPrefix, errors);
  return { ...patch, code: input.code };
}

function mapTaxExemptionPatch(
  input: CustomerTaxExemptionPatchInput | CustomerTaxExemptionCreateOperationInput,
  fieldPrefix: string[],
  errors: UserError[],
): CustomerTaxExemptionPatchParams {
  const result = pickPresent(input, [
    "code",
    "countryCode",
    "regionCode",
    "reason",
    "validFrom",
    "validTo",
  ]) as CustomerTaxExemptionPatchParams;
  if (hasOwn(input, "status")) {
    result.status = input.status
      ? (String(input.status) as CustomerTaxExemptionStatus)
      : input.status;
  }
  if (hasOwn(input, "certificateFileId")) {
    result.certificateFileId = input.certificateFileId
      ? decodeId(
          input.certificateFileId,
          GlobalIdEntity.File,
          [...fieldPrefix, "certificateFileId"],
          errors,
        )
      : input.certificateFileId;
  }
  return result;
}

function mapGroups(
  inputs: readonly CustomerGroupMembershipUpdateOperationInput[],
): CustomerUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "groups"];
  const memberships = inputs.flatMap((input, index) => {
    const groupId = decodeId(
      input.groupId,
      GlobalIdEntity.CustomerGroup,
      [...fieldPrefix, "memberships", String(index), "groupId"],
      errors,
    );
    return groupId
      ? [
          {
            groupId,
            ...(hasOwn(input, "isPrimary") ? { isPrimary: input.isPrimary } : {}),
            ...(hasOwn(input, "expiresAt") ? { expiresAt: input.expiresAt } : {}),
          },
        ]
      : [];
  });
  return mappedEntry(
    {
      type: "groupUpdate",
      params: { memberships },
      meta: { fieldPrefix },
    },
    errors,
  );
}

function mapIdReplacement(
  type: "tagUpdate" | "segmentUpdate",
  globalIds: readonly string[],
): CustomerUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldName = type === "tagUpdate" ? "tags" : "segments";
  const listName = type === "tagUpdate" ? "tagIds" : "segmentIds";
  const expectedType =
    type === "tagUpdate" ? GlobalIdEntity.CustomerTag : GlobalIdEntity.CustomerSegment;
  const ids = decodeIds(globalIds, expectedType, ["operations", fieldName, listName], errors);
  const operation: CustomerUpdateOperation =
    type === "tagUpdate"
      ? {
          type,
          params: { tagIds: ids },
          meta: { fieldPrefix: ["operations", fieldName] },
        }
      : {
          type,
          params: { segmentIds: ids },
          meta: { fieldPrefix: ["operations", fieldName] },
        };
  return mappedEntry(operation, errors);
}

function validEntry(
  type: CustomerUpdateOperation["type"],
  operation: CustomerUpdateOperation,
): CustomerUpdateMappedEntry {
  return { type, operation, errors: [] };
}

function mappedEntry(
  operation: CustomerUpdateOperation,
  errors: UserError[],
): CustomerUpdateMappedEntry {
  return {
    type: operation.type,
    operation: errors.length === 0 ? operation : undefined,
    errors,
  };
}

function decodeId(
  globalId: string,
  expectedType: GlobalIdType,
  field: string[],
  errors: UserError[],
): string | undefined {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    errors.push({
      message: "Invalid ID format",
      code: "INVALID_ID",
      field,
    });
    return undefined;
  }
}

function decodeIds(
  globalIds: readonly string[],
  expectedType: GlobalIdType,
  field: string[],
  errors: UserError[],
): string[] {
  return globalIds.flatMap((globalId, index) => {
    const id = decodeId(globalId, expectedType, [...field, String(index)], errors);
    return id ? [id] : [];
  });
}

function pickPresent<T extends object, K extends string>(
  input: T,
  keys: readonly K[],
): Record<string, unknown> {
  const source = input as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (hasOwn(input, key)) result[key] = source[key];
  }
  return result;
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const addressCreateOptionalFields = [
  "label",
  "prefix",
  "firstName",
  "middleName",
  "lastName",
  "suffix",
  "companyName",
  "phoneE164",
  "address2",
  "regionName",
  "regionCode",
  "postalCode",
  "isDefaultShipping",
  "isDefaultBilling",
  "latitude",
  "longitude",
] as const;

const addressPatchFields = [
  "label",
  "prefix",
  "firstName",
  "middleName",
  "lastName",
  "suffix",
  "companyName",
  "phoneE164",
  "address1",
  "address2",
  "city",
  "regionName",
  "regionCode",
  "postalCode",
  "countryCode",
  "latitude",
  "longitude",
] as const satisfies readonly (keyof CustomerAddressPatchInput)[];
