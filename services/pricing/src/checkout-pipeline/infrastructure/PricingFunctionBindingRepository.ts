import { and, asc, eq, inArray } from "drizzle-orm";
import type { CommerceFunctionBindingRef } from "@shopana/function-runner";
import type { Database } from "../../infrastructure/db/database.js";
import { discount, discountFunctionBinding } from "../../repositories/models/index.js";
import { contentRevision } from "../canonicalJson.js";
import type { PricingDiscountFunctionTarget } from "../discount-function-contracts.js";

export class PricingFunctionBindingRepository {
  constructor(private readonly db: Database) {}
  async listActive(input: {
    storeId: string;
    target: PricingDiscountFunctionTarget;
    discountIds: readonly string[];
  }): Promise<{ bindingSetRevision: string; bindings: readonly CommerceFunctionBindingRef[] }> {
    if (!input.discountIds.length)
      return { bindingSetRevision: contentRevision("pricing-function-bindings", []), bindings: [] };
    const rows = await this.db
      .select()
      .from(discountFunctionBinding)
      .where(
        and(
          eq(discountFunctionBinding.storeId, input.storeId),
          eq(discountFunctionBinding.target, input.target),
          eq(discountFunctionBinding.status, "ACTIVE"),
          inArray(discountFunctionBinding.discountId, [...input.discountIds]),
        ),
      )
      .orderBy(
        asc(discountFunctionBinding.precedence),
        asc(discountFunctionBinding.activationSequence),
        asc(discountFunctionBinding.id),
      );
    const bindings: CommerceFunctionBindingRef[] = rows.map((row) => ({
      functionBindingId: row.id,
      installationId: row.installationId,
      functionKey: row.functionKey,
      owner: { service: "pricing", resourceType: "discount", resourceId: row.discountId },
      configurationRevision: row.configurationRevision,
      configurationSnapshot: row.configurationSnapshot,
      routeRevision: row.routeRevision,
      precedence: row.precedence,
      activationSequence: row.activationSequence,
      failureMode: row.failureMode,
    }));
    return {
      bindingSetRevision: contentRevision(
        "pricing-function-bindings",
        rows.map((row) => ({ ...row, activationSequence: String(row.activationSequence) })),
      ),
      bindings,
    };
  }

  async save(input: {
    id: string;
    storeId: string;
    discountId: string;
    target: PricingDiscountFunctionTarget;
    contractVersion: number;
    installationId: string;
    functionKey: string;
    precedence: number;
    activationSequence: number;
    status: "ACTIVE" | "DISABLED";
    failureMode: "REQUIRED" | "OPTIONAL";
    configurationSnapshot: Record<string, unknown>;
    configurationRevision: string;
    routeRevision: string;
  }) {
    return this.db.transaction(async (tx) => {
      const owner = (
        await tx
          .select()
          .from(discount)
          .where(and(eq(discount.storeId, input.storeId), eq(discount.id, input.discountId)))
          .limit(1)
          .for("update")
      )[0];
      const expectedTarget =
        owner?.discountClass === "SHIPPING"
          ? "cart.delivery-options.discounts.generate.run"
          : "cart.lines.discounts.generate.run";
      if (
        !owner ||
        owner.calculationStrategy !== "FUNCTION" ||
        owner.kind !== null ||
        input.target !== expectedTarget
      )
        throw new Error("Function binding does not match its Pricing discount owner");
      const [row] = await tx
        .insert(discountFunctionBinding)
        .values(input)
        .onConflictDoUpdate({
          target: [discountFunctionBinding.discountId, discountFunctionBinding.target],
          set: {
            contractVersion: input.contractVersion,
            installationId: input.installationId,
            functionKey: input.functionKey,
            precedence: input.precedence,
            activationSequence: input.activationSequence,
            status: input.status,
            failureMode: input.failureMode,
            configurationSnapshot: input.configurationSnapshot,
            configurationRevision: input.configurationRevision,
            routeRevision: input.routeRevision,
            updatedAt: new Date().toISOString(),
          },
        })
        .returning();
      return row!;
    });
  }
}
