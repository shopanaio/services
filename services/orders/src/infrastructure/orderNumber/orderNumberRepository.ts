import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql } from "@event-driven-io/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import type { OrderNumberPort } from "@src/application/ports/orderNumberPort";

type ReserveRow = {
  last_number: string;
};

export class OrderNumberRepository implements OrderNumberPort {
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  async reserve(projectId: string): Promise<number> {
    const query = knex
      .withSchema("platform")
      .table("order_number_counters")
      .insert({
        project_id: projectId,
        last_number: 1,
      })
      .onConflict("project_id")
      .merge({
        last_number: knex.raw('"order_number_counters"."last_number" + 1'),
        updated_at: knex.raw("NOW()"),
      })
      .returning("last_number")
      .toString();

    const result = await this.execute.query<ReserveRow>(rawSql(query));
    const row = result.rows[0];
    if (!row) {
      throw new Error(`Failed to reserve order number for project ${projectId}`);
    }

    const numberValue = Number(row.last_number);
    if (!Number.isFinite(numberValue)) {
      throw new Error(
        `Invalid order number value returned for project ${projectId}`
      );
    }

    return numberValue;
  }
}
