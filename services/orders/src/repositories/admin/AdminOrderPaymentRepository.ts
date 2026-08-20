import { sql } from "drizzle-orm";
import type {
  AdminOrderCommandInput,
  AdminOrderCommandName,
} from "../../domain/admin/AdminOrderCommandContracts.js";
import type { MutableAdminOrderCommandResult } from "../../application/admin/AdminOrderCommandPorts.js";
import {
  asRecord,
  moneyMinor,
  optionalString,
  requiredDateTime,
  requiredString,
} from "./AdminOrderCommandValues.js";

import { AdminOrderCoreRepository } from "./AdminOrderCoreRepository.js";
export class AdminOrderPaymentRepository extends AdminOrderCoreRepository {
  public async recordManualPayment(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const amount = moneyMinor(asRecord(request.input.amount), order.currency_code);
    if (amount <= 0n) throw new Error("ORDER_PAYMENT_AMOUNT_INVALID");
    const transactionId = await this.generateUuidV7();
    const paidAt = requiredDateTime(request.input, "paidAt");
    await this.connection.execute(sql`
      INSERT INTO orders.order_payment_transactions (
        id, store_id, order_id, currency_code, kind, status, amount, provider,
        provider_transaction_id, receipt, provider_data, processed_at, created_at, updated_at
      ) VALUES (
        ${transactionId}, ${request.context.storeId}, ${order.id}, ${order.currency_code},
        'MANUAL', 'SUCCESS', ${amount}, ${requiredString(request.input, "methodCode")},
        ${optionalString(request.input.reference)},
        ${JSON.stringify({ note: optionalString(request.input.note) })}::jsonb,
        '{}'::jsonb, ${paidAt}, ${paidAt}, ${paidAt}
      )
    `);
    const paidRows = await this.connection.execute<{ amount: string }>(sql`
      SELECT COALESCE(sum(amount), 0)::text AS amount
      FROM orders.order_payment_transactions
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND kind IN ('CAPTURE', 'SALE', 'MANUAL') AND status = 'SUCCESS'
    `);
    const paid = BigInt(paidRows[0]?.amount ?? "0");
    const paymentStatus = paid >= BigInt(order.total_amount) ? "PAID" : "PARTIALLY_PAID";
    await this.connection.execute(sql`
      UPDATE orders.orders SET payment_status = ${paymentStatus}::orders.order_payment_status,
        updated_at = ${paidAt}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    const result = await this.bumpAndAudit(
      request,
      order,
      command,
      { transactionId, amountMinor: amount.toString(), methodCode: request.input.methodCode },
      paidAt,
    );
    return { ...result, resourceId: transactionId };
  }

  public async overridePaymentStatus(
    request: AdminOrderCommandInput,
    command: AdminOrderCommandName,
  ): Promise<MutableAdminOrderCommandResult> {
    const order = await this.lockOrder(request);
    const status = requiredString(request.input, "status");
    requiredString(request.input, "reasonCode");
    requiredString(request.input, "note");
    const online = await this.connection.execute<{ found: boolean }>(sql`
      SELECT true AS found
      FROM orders.order_payment_methods
      WHERE store_id = ${request.context.storeId} AND order_id = ${order.id}
        AND flow = 'ONLINE' AND is_selected = true
      LIMIT 1
    `);
    if (online[0]) throw new Error("ORDER_ONLINE_PAYMENT_OVERRIDE_FORBIDDEN");
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      UPDATE orders.orders SET payment_status = ${status}::orders.order_payment_status,
        updated_at = ${now}
      WHERE store_id = ${request.context.storeId} AND id = ${order.id}
    `);
    return this.bumpAndAudit(request, order, command, request.input, now);
  }
}
