import { rawSql } from "@event-driven-io/dumbo";
import { postgreSQLRawBatchSQLProjection } from "@event-driven-io/emmett-postgresql";
import type {
  CheckoutDeliveryGroupAddressUpdated,
  CheckoutDeliveryGroupAddressCleared,
  CheckoutDeliveryGroupMethodUpdated,
  CheckoutDeliveryGroupRemoved,
} from "@src/domain/checkout/events";
import { knex } from "@src/infrastructure/db/knex";

/**
 * Projections for delivery groups operations.
 * These projections maintain delivery groups tables and related data.
 */

// removed: groups created — groups are created on checkout.created

// Projection for delivery group address updates

export const checkoutDeliveryGroupAddressUpdatedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutDeliveryGroupAddressUpdated>(
    (events) => {
      const sqls = events.flatMap((event) => {
        const { deliveryGroupId, address } = event.data;

        console.log(address, "address");
        // UPSERT address using INSERT ... ON CONFLICT
        const upsertAddressSql = knex
          .withSchema("platform")
          .table("checkout_delivery_addresses")
          .insert({
            id: address.id,
            delivery_group_id: deliveryGroupId,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            country_code: address.countryCode,
            province_code: address.provinceCode,
            postal_code: address.postalCode,
            first_name: address.firstName,
            last_name: address.lastName,
            email: address.email,
            phone: address.phone,
            metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
            created_at: event.metadata.now,
            updated_at: event.metadata.now,
          })
          // .toString();
          // TODO: Unique constraint on delivery_group_id
          .onConflict("id")
          .merge({
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            country_code: address.countryCode,
            province_code: address.provinceCode,
            postal_code: address.postalCode,
            first_name: address.firstName,
            last_name: address.lastName,
            email: address.email,
            phone: address.phone,
            metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
            updated_at: knex.fn.now(),
          })
          .toString();

        // Update delivery group timestamp
        const updateGroupSql = knex
          .withSchema("platform")
          .table("checkout_delivery_groups")
          .where("id", deliveryGroupId)
          .update({ updated_at: knex.fn.now() })
          .toString();

        return [rawSql(upsertAddressSql), rawSql(updateGroupSql)];
      });

      return sqls;
    },
    "checkout.delivery.group.address.updated"
  );

// Projection for delivery group address cleared

export const checkoutDeliveryGroupAddressClearedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutDeliveryGroupAddressCleared>(
    (events) => {
      const sqls = events.flatMap((event) => {
        const { deliveryGroupId, addressId } = event.data;
        const deleteAddressSql = knex
          .withSchema("platform")
          .table("checkout_delivery_addresses")
          .where({
            id: addressId,
            delivery_group_id: deliveryGroupId,
          })
          .del()
          .toString();

        const updateGroupSql = knex
          .withSchema("platform")
          .table("checkout_delivery_groups")
          .where("id", deliveryGroupId)
          .update({ updated_at: knex.fn.now() })
          .toString();

        return [rawSql(deleteAddressSql), rawSql(updateGroupSql)];
      });

      return sqls;
    },
    "checkout.delivery.group.address.cleared"
  );

// Projection for delivery group method updates with totals

export const checkoutDeliveryGroupMethodUpdatedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutDeliveryGroupMethodUpdated>(
    (events) => {
      const sqls = events.flatMap((event) => {
        const { deliveryGroupId, deliveryMethod, shippingTotal } = event.data;
        const checkoutId = event.metadata.aggregateId;

        // Update delivery group selected method
        const updateGroupSql = knex
          .withSchema("platform")
          .table("checkout_delivery_groups")
          .where("id", deliveryGroupId)
          .update({
            selected_delivery_method: deliveryMethod.code,
            updated_at: knex.fn.now(),
          })
          .toString();

        const stmts = [rawSql(updateGroupSql)];

        if (shippingTotal !== undefined) {
          const updateFields: any = {
            shipping_total: shippingTotal?.toString() || "0",
            updated_at: knex.fn.now(),
            // Recalculate grand_total with shipping: subtotal + tax_total + shipping_total - discount_total
            grand_total: knex.raw(
              "subtotal + tax_total + shipping_total - discount_total"
            ),
          };

          const updateCheckoutSql = knex
            .withSchema("platform")
            .table("checkouts")
            .where("id", checkoutId)
            .update(updateFields)
            .toString();

          stmts.push(rawSql(updateCheckoutSql));
        }

        return stmts;
      });

      return sqls;
    },
    "checkout.delivery.group.method.updated"
  );

// Projection for delivery group removal with totals

export const checkoutDeliveryGroupRemovedProjection =
  postgreSQLRawBatchSQLProjection<CheckoutDeliveryGroupRemoved>((events) => {
    const sqls = events.flatMap((event) => {
      const { deliveryGroupId, shippingTotal } = event.data;
      const checkoutId = event.metadata.aggregateId;

      // Remove delivery address if exists
      const deleteAddressSql = knex
        .withSchema("platform")
        .table("checkout_delivery_addresses")
        .where("delivery_group_id", deliveryGroupId)
        .del()
        .toString();

      // Remove delivery group
      const deleteGroupSql = knex
        .withSchema("platform")
        .table("checkout_delivery_groups")
        .where("id", deliveryGroupId)
        .del()
        .toString();

      const stmts = [rawSql(deleteAddressSql), rawSql(deleteGroupSql)];

      if (shippingTotal !== undefined) {
        const updateFields: any = {
          shipping_total: shippingTotal?.toString() || "0",
          updated_at: knex.fn.now(),
          // Recalculate grand_total with shipping: subtotal + tax_total + shipping_total - discount_total
          grand_total: knex.raw(
            "subtotal + tax_total + shipping_total - discount_total"
          ),
        };

        const updateCheckoutSql = knex
          .withSchema("platform")
          .table("checkouts")
          .where("id", checkoutId)
          .update(updateFields)
          .toString();

        stmts.push(rawSql(updateCheckoutSql));
      }

      return stmts;
    });

    return sqls;
  }, "checkout.delivery.group.removed");
