import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerAddressGlobalId,
  decodeCustomerGlobalId,
} from "../global-id-where-mappers.js";
import {
  customerAddress,
  type CustomerAddress,
  type NewCustomerAddress,
} from "../models/index.js";
import { normalizeAddressKeys } from "../../segments/normalization.js";

export const customerAddressRelayQuery = createRelayQuery(
  createQuery(customerAddress)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerAddressGlobalId,
      customerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerAddress", tieBreaker: "id" }
);

export type CustomerAddressRelayInput = InferRelayInput<
  typeof customerAddressRelayQuery
>;
export type CustomerAddressConnectionInput = CustomerAddressRelayInput & {
  customerId: string;
};

export type CustomerAddressCreateData = Omit<
  NewCustomerAddress,
  | "id"
  | "storeId"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "validationStatus"
  | "validatedAt"
  | "latitude"
  | "longitude"
  | "regionKey"
  | "cityKey"
  | "postalCodeNormalized"
> & {
  latitude?: number | string | null;
  longitude?: number | string | null;
};
export type CustomerAddressPatch = Partial<
  Omit<
    Pick<
    NewCustomerAddress,
    | "label"
    | "prefix"
    | "firstName"
    | "middleName"
    | "lastName"
    | "suffix"
    | "companyName"
    | "phoneE164"
    | "address1"
    | "address2"
    | "city"
    | "regionName"
    | "regionCode"
    | "postalCode"
    | "countryCode"
    | "validationStatus"
    | "validatedAt"
    >,
    "latitude" | "longitude"
  > & {
    latitude?: number | string | null;
    longitude?: number | string | null;
  }
>;

export class CustomerAddressRepository extends BaseRepository {
  @ReadOnly()
  async exists(id: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: customerAddress.id })
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.id, id),
          isNull(customerAddress.deletedAt)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  @ReadOnly()
  async findById(id: string): Promise<CustomerAddress | null> {
    const rows = await this.connection
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.id, id),
          isNull(customerAddress.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findOwnedById(
    customerId: string,
    id: string
  ): Promise<CustomerAddress | null> {
    const rows = await this.connection
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.customerId, customerId),
          eq(customerAddress.id, id),
          isNull(customerAddress.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerAddress[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          inArray(customerAddress.id, [...new Set(ids)]),
          isNull(customerAddress.deletedAt)
        )
      );
  }

  @ReadOnly()
  async getByCustomerIds(customerIds: readonly string[]): Promise<CustomerAddress[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          inArray(customerAddress.customerId, [...new Set(customerIds)]),
          isNull(customerAddress.deletedAt)
        )
      );
  }

  @ReadOnly()
  async findDefaultShipping(customerId: string): Promise<CustomerAddress | null> {
    return this.findDefault(customerId, "shipping");
  }

  @ReadOnly()
  async findDefaultBilling(customerId: string): Promise<CustomerAddress | null> {
    return this.findDefault(customerId, "billing");
  }

  @Transactional()
  async create(data: CustomerAddressCreateData): Promise<CustomerAddress> {
    if (data.isDefaultShipping || data.isDefaultBilling) {
      await this.clearDefaults(data.customerId, {
        shipping: data.isDefaultShipping === true,
        billing: data.isDefaultBilling === true,
      });
    }
    const now = new Date().toISOString();
    const normalized = normalizeAddressKeys(data);
    const row: NewCustomerAddress = {
      ...data,
      ...normalized,
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      latitude: normalizeCoordinate(data.latitude),
      longitude: normalizeCoordinate(data.longitude),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const rows = await this.connection
      .insert(customerAddress)
      .values(row)
      .returning();
    return rows[0];
  }

  async update(id: string, patch: CustomerAddressPatch): Promise<CustomerAddress | null> {
    const current = await this.findById(id);
    return current
      ? this.updateOwned(current.customerId, id, patch)
      : null;
  }

  async updateOwned(
    customerId: string,
    id: string,
    patch: CustomerAddressPatch
  ): Promise<CustomerAddress | null> {
    const { latitude, longitude, countryCode, ...fields } = patch;
    const current = await this.findOwnedById(customerId, id);
    if (!current) return null;
    const normalized = normalizeAddressKeys({
      countryCode: countryCode ?? current.countryCode,
      regionCode: patch.regionCode === undefined ? current.regionCode : patch.regionCode,
      city: patch.city ?? current.city,
      postalCode: patch.postalCode === undefined ? current.postalCode : patch.postalCode,
    });
    const rows = await this.connection
      .update(customerAddress)
      .set({
        ...fields,
        ...normalized,
        ...(latitude !== undefined
          ? { latitude: normalizeCoordinate(latitude) }
          : {}),
        ...(longitude !== undefined
          ? { longitude: normalizeCoordinate(longitude) }
          : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.customerId, customerId),
          eq(customerAddress.id, id),
          isNull(customerAddress.deletedAt)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const current = await this.findById(id);
    return current
      ? this.softDeleteOwned(current.customerId, id)
      : false;
  }

  async softDeleteOwned(customerId: string, id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerAddress)
      .set({
        isDefaultShipping: false,
        isDefaultBilling: false,
        deletedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.customerId, customerId),
          eq(customerAddress.id, id),
          isNull(customerAddress.deletedAt)
        )
      )
      .returning({ id: customerAddress.id });
    return rows.length > 0;
  }

  async redactForCustomer(
    customerId: string,
    redactedAt: string,
  ): Promise<number> {
    const rows = await this.connection
      .update(customerAddress)
      .set({
        label: null,
        prefix: null,
        firstName: null,
        middleName: null,
        lastName: null,
        suffix: null,
        companyName: null,
        phoneE164: null,
        address1: "[redacted]",
        address2: null,
        city: "[redacted]",
        cityKey: "ZZ::[redacted]",
        regionName: null,
        regionCode: null,
        regionKey: null,
        postalCode: null,
        postalCodeNormalized: null,
        countryCode: "ZZ",
        isDefaultShipping: false,
        isDefaultBilling: false,
        validationStatus: "UNVALIDATED",
        validatedAt: null,
        latitude: null,
        longitude: null,
        updatedAt: redactedAt,
        deletedAt: redactedAt,
      })
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.customerId, customerId),
        ),
      )
      .returning({ id: customerAddress.id });
    return rows.length;
  }

  @Transactional()
  async setDefaults(
    customerId: string,
    input: { shippingAddressId?: string | null; billingAddressId?: string | null }
  ): Promise<boolean> {
    const requestedIds = [
      input.shippingAddressId,
      input.billingAddressId,
    ].filter((id): id is string => Boolean(id));
    if (requestedIds.length > 0) {
      const existing = await this.connection
        .select({ id: customerAddress.id })
        .from(customerAddress)
        .where(
          and(
            eq(customerAddress.storeId, this.storeId),
            eq(customerAddress.customerId, customerId),
            inArray(customerAddress.id, [...new Set(requestedIds)]),
            isNull(customerAddress.deletedAt)
          )
        );
      if (existing.length !== new Set(requestedIds).size) return false;
    }
    await this.clearDefaults(customerId, { shipping: true, billing: true });

    if (input.shippingAddressId) {
      const updated = await this.setDefault(
        customerId,
        input.shippingAddressId,
        "shipping"
      );
      if (!updated) return false;
    }
    if (input.billingAddressId) {
      const updated = await this.setDefault(
        customerId,
        input.billingAddressId,
        "billing"
      );
      if (!updated) return false;
    }
    return true;
  }

  @ReadOnly()
  async getConnection(
    input: CustomerAddressConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { customerId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerAddressRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { customerId: { _eq: customerId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [
      { field: "createdAt", direction: "asc" },
      { field: "id", direction: "desc" },
    ];
    const query: CustomerAddressRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        customerId,
        where: where ?? null,
        orderBy: effectiveOrder,
      },
    };
    const [result, totalCount] = await Promise.all([
      customerAddressRelayQuery.execute(this.connection, query),
      customerAddressRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async findDefault(
    customerId: string,
    kind: "shipping" | "billing"
  ): Promise<CustomerAddress | null> {
    const rows = await this.connection
      .select()
      .from(customerAddress)
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.customerId, customerId),
          kind === "shipping"
            ? eq(customerAddress.isDefaultShipping, true)
            : eq(customerAddress.isDefaultBilling, true),
          isNull(customerAddress.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private async clearDefaults(
    customerId: string,
    input: { shipping: boolean; billing: boolean }
  ): Promise<void> {
    if (!input.shipping && !input.billing) return;
    await this.connection
      .update(customerAddress)
      .set({
        ...(input.shipping ? { isDefaultShipping: false } : {}),
        ...(input.billing ? { isDefaultBilling: false } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.customerId, customerId),
          isNull(customerAddress.deletedAt)
        )
      );
  }

  private async setDefault(
    customerId: string,
    addressId: string,
    kind: "shipping" | "billing"
  ): Promise<boolean> {
    const rows = await this.connection
      .update(customerAddress)
      .set({
        ...(kind === "shipping"
          ? { isDefaultShipping: true }
          : { isDefaultBilling: true }),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerAddress.storeId, this.storeId),
          eq(customerAddress.customerId, customerId),
          eq(customerAddress.id, addressId),
          isNull(customerAddress.deletedAt)
        )
      )
      .returning({ id: customerAddress.id });
    return rows.length > 0;
  }
}

function normalizeCoordinate(value: number | string | null | undefined): string | null {
  return value == null ? null : String(value);
}
