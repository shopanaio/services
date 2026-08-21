import { and, asc, eq, gt } from "drizzle-orm";
import type { Payments } from "@shopana/broker-types";
import type { CommerceFunctionBindingRef } from "@shopana/function-runner";
import { TransactionManager } from "@shopana/shared-kernel";
import type {
  PaymentCustomizationBindingsPort,
  PaymentMethodBindingCandidate,
  PaymentMethodBindingsPort,
  PaymentLifecycleMethodBindingsPort,
  PaymentProviderAccountsPort,
} from "../../contracts/ports.js";
import { canonicalJson, contentRevision } from "../../checkout-pipeline/canonicalJson.js";
import { PaymentsCheckoutError } from "../../checkout-pipeline/errors.js";
import type { PaymentsDatabase } from "./database.js";
import {
  checkoutMethodBinding,
  checkoutMethodExecution,
  checkoutMethodSnapshot,
  paymentCustomization,
  paymentCustomizationBinding,
  paymentMethodHandleIdentity,
  paymentProviderAccount,
} from "./schema.js";

abstract class BaseRepository {
  constructor(
    protected readonly db: PaymentsDatabase,
    protected readonly tx: TransactionManager<PaymentsDatabase>,
  ) {}
  protected get connection(): PaymentsDatabase {
    return this.tx.getConnection() as PaymentsDatabase;
  }
}

function account(
  row: typeof paymentProviderAccount.$inferSelect,
): Payments.PaymentProviderAccountSnapshot {
  return {
    providerAccountId: row.id,
    organizationId: row.organizationId,
    storeId: row.storeId,
    installationId: row.installationId,
    appCode: row.appCode,
    appVersion: row.appVersion,
    providerCode: row.providerCode,
    displayName: row.displayName,
    status: row.status,
    mode: row.mode,
    captureMode: row.captureMode,
    capabilities: row.capabilities as Payments.PaymentProviderCapabilities,
    configurationRevision: row.configurationRevision,
    supportedCurrencyCodes: row.supportedCurrencyCodes as string[],
    supportedCountryCodes: row.supportedCountryCodes as string[],
    supportedSessionKinds: row.supportedSessionKinds as Payments.PaymentSessionKind[],
    supportedOperations: row.supportedOperations as Payments.PaymentProviderOperation[],
    enabledMethodKeys: row.enabledMethodKeys as string[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PaymentProviderAccountRepository
  extends BaseRepository
  implements PaymentProviderAccountsPort
{
  async listActiveForStore(storeId: string) {
    return (
      await this.connection
        .select()
        .from(paymentProviderAccount)
        .where(
          and(
            eq(paymentProviderAccount.storeId, storeId),
            eq(paymentProviderAccount.status, "ACTIVE"),
          ),
        )
        .orderBy(asc(paymentProviderAccount.id))
    ).map(account);
  }
  async getById(storeId: string, providerAccountId: string) {
    const row = (
      await this.connection
        .select()
        .from(paymentProviderAccount)
        .where(
          and(
            eq(paymentProviderAccount.storeId, storeId),
            eq(paymentProviderAccount.id, providerAccountId),
          ),
        )
        .limit(1)
    )[0];
    return row ? account(row) : null;
  }
  async getByInstallation(storeId: string, installationId: string) {
    const row = (
      await this.connection
        .select()
        .from(paymentProviderAccount)
        .where(
          and(
            eq(paymentProviderAccount.storeId, storeId),
            eq(paymentProviderAccount.installationId, installationId),
          ),
        )
        .limit(1)
    )[0];
    return row ? account(row) : null;
  }
  async save(value: Payments.PaymentProviderAccountSnapshot) {
    try {
      return await this.tx.run(async () => {
        const currentRow = (
          await this.connection
            .select()
            .from(paymentProviderAccount)
            .where(
              and(
                eq(paymentProviderAccount.storeId, value.storeId),
                eq(paymentProviderAccount.installationId, value.installationId),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        const current = currentRow ? account(currentRow) : null;
        const values = {
          id: value.providerAccountId,
          organizationId: value.organizationId,
          storeId: value.storeId,
          installationId: value.installationId,
          appCode: value.appCode,
          appVersion: value.appVersion,
          providerCode: value.providerCode,
          displayName: value.displayName,
          status: value.status,
          mode: value.mode,
          captureMode: value.captureMode,
          capabilities: value.capabilities,
          configurationRevision: value.configurationRevision,
          supportedCurrencyCodes: value.supportedCurrencyCodes,
          supportedCountryCodes: value.supportedCountryCodes,
          supportedSessionKinds: value.supportedSessionKinds,
          supportedOperations: value.supportedOperations,
          enabledMethodKeys: value.enabledMethodKeys,
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
        };
        const [row] = current
          ? await this.connection
              .update(paymentProviderAccount)
              .set(values)
              .where(
                and(
                  eq(paymentProviderAccount.storeId, value.storeId),
                  eq(paymentProviderAccount.id, current.providerAccountId),
                ),
              )
              .returning()
          : await this.connection.insert(paymentProviderAccount).values(values).returning();
        return { status: "SAVED" as const, account: account(row!) };
      });
    } catch (error) {
      throw error;
    }
  }
}

function customization(
  row: typeof paymentCustomization.$inferSelect,
): Payments.PaymentMethodCustomizationSnapshot {
  return {
    customizationId: row.id,
    storeId: row.storeId,
    status: row.status,
    policyRevision: row.policyRevision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function customizationBinding(
  row: typeof paymentCustomizationBinding.$inferSelect,
): Payments.PaymentMethodCustomizationBindingSnapshot {
  return {
    functionBindingId: row.id,
    storeId: row.storeId,
    customizationId: row.customizationId,
    installationId: row.installationId,
    functionKey: row.functionKey,
    contractVersion: 1,
    precedence: row.precedence,
    activationSequence: row.activationSequence,
    failureMode: row.failureMode,
    configurationSnapshot:
      row.configurationSnapshot as Payments.PaymentMethodCustomizationBindingSnapshot["configurationSnapshot"],
    configurationRevision: row.configurationRevision,
    routeRevision: row.routeRevision,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PaymentCustomizationBindingRepository
  extends BaseRepository
  implements PaymentCustomizationBindingsPort
{
  async listActive(storeId: string): Promise<{
    policyRevision: string;
    bindingSetRevision: string;
    bindings: readonly CommerceFunctionBindingRef[];
  }> {
    const rows = await this.connection
      .select({ binding: paymentCustomizationBinding, owner: paymentCustomization })
      .from(paymentCustomizationBinding)
      .innerJoin(
        paymentCustomization,
        and(
          eq(paymentCustomization.storeId, paymentCustomizationBinding.storeId),
          eq(paymentCustomization.id, paymentCustomizationBinding.customizationId),
        ),
      )
      .where(
        and(
          eq(paymentCustomizationBinding.storeId, storeId),
          eq(paymentCustomizationBinding.status, "ACTIVE"),
          eq(paymentCustomization.status, "ACTIVE"),
        ),
      )
      .orderBy(
        asc(paymentCustomizationBinding.precedence),
        asc(paymentCustomizationBinding.activationSequence),
        asc(paymentCustomizationBinding.id),
      );
    return {
      policyRevision: contentRevision(
        "payment-customization-policy",
        rows.map(({ owner }) => owner.policyRevision),
      ),
      bindingSetRevision: contentRevision(
        "payment-customization-bindings",
        rows.map(({ binding }) => ({
          ...binding,
          activationSequence: String(binding.activationSequence),
        })),
      ),
      bindings: rows.map(({ binding }) => ({
        functionBindingId: binding.id,
        installationId: binding.installationId,
        functionKey: binding.functionKey,
        owner: {
          service: "payments",
          resourceType: "payment_customization",
          resourceId: binding.customizationId,
        },
        configurationRevision: binding.configurationRevision,
        configurationSnapshot: binding.configurationSnapshot,
        routeRevision: binding.routeRevision,
        precedence: binding.precedence,
        activationSequence: binding.activationSequence,
        failureMode: binding.failureMode,
      })),
    };
  }

  async listForCustomization(input: { storeId: string; customizationId: string }) {
    const rows = await this.connection
      .select()
      .from(paymentCustomizationBinding)
      .where(
        and(
          eq(paymentCustomizationBinding.storeId, input.storeId),
          eq(paymentCustomizationBinding.customizationId, input.customizationId),
        ),
      )
      .orderBy(
        asc(paymentCustomizationBinding.precedence),
        asc(paymentCustomizationBinding.activationSequence),
        asc(paymentCustomizationBinding.id),
      );
    return rows.map(customizationBinding);
  }

  async configure(
    input: Payments.ConfigurePaymentMethodCustomizationParams & {
      policyRevision: string;
    },
  ): Promise<Payments.ConfigurePaymentMethodCustomizationResult> {
    return this.tx.run(async () => {
      const now = new Date().toISOString();
      const currentOwner = (
        await this.connection
          .select()
          .from(paymentCustomization)
          .where(
            and(
              eq(paymentCustomization.storeId, input.storeId),
              eq(paymentCustomization.id, input.customizationId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      const [owner] = currentOwner
        ? await this.connection
            .update(paymentCustomization)
            .set({
              status: input.customizationStatus,
              policyRevision: input.policyRevision,
              updatedAt: now,
            })
            .where(
              and(
                eq(paymentCustomization.storeId, input.storeId),
                eq(paymentCustomization.id, input.customizationId),
              ),
            )
            .returning()
        : await this.connection
            .insert(paymentCustomization)
            .values({
              id: input.customizationId,
              storeId: input.storeId,
              status: input.customizationStatus,
              policyRevision: input.policyRevision,
              createdAt: now,
              updatedAt: now,
            })
            .returning();

      const currentBinding = (
        await this.connection
          .select()
          .from(paymentCustomizationBinding)
          .where(
            and(
              eq(paymentCustomizationBinding.storeId, input.storeId),
              eq(paymentCustomizationBinding.id, input.functionBindingId),
            ),
          )
          .limit(1)
          .for("update")
      )[0];
      if (currentBinding && currentBinding.customizationId !== input.customizationId) {
        throw new Error("PAYMENT_CUSTOMIZATION_BINDING_OWNER_MISMATCH");
      }
      const bindingValues = {
        storeId: input.storeId,
        customizationId: input.customizationId,
        installationId: input.installationId,
        functionKey: input.functionKey,
        contractVersion: input.contractVersion,
        precedence: input.precedence,
        activationSequence: input.activationSequence,
        failureMode: input.failureMode,
        configurationSnapshot: input.configurationSnapshot,
        configurationRevision: input.configurationRevision,
        routeRevision: input.routeRevision,
        status: input.bindingStatus,
        updatedAt: now,
      };
      const [bindingRow] = currentBinding
        ? await this.connection
            .update(paymentCustomizationBinding)
            .set(bindingValues)
            .where(
              and(
                eq(paymentCustomizationBinding.storeId, input.storeId),
                eq(paymentCustomizationBinding.id, input.functionBindingId),
              ),
            )
            .returning()
        : await this.connection
            .insert(paymentCustomizationBinding)
            .values({
              id: input.functionBindingId,
              ...bindingValues,
              createdAt: now,
            })
            .returning();
      return {
        customization: customization(owner!),
        binding: customizationBinding(bindingRow!),
      };
    });
  }

  async setStatus(input: Payments.SetPaymentMethodCustomizationStatusParams) {
    const [row] = await this.connection
      .update(paymentCustomization)
      .set({ status: input.status, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(paymentCustomization.storeId, input.storeId),
          eq(paymentCustomization.id, input.customizationId),
        ),
      )
      .returning();
    return row ? customization(row) : null;
  }
}

function binding(
  row: typeof checkoutMethodBinding.$inferSelect,
): Payments.PaymentMethodBindingSnapshot {
  return {
    methodHandle: row.methodHandle,
    providerAccountId: row.providerAccountId,
    providerCode: row.providerCode,
    providerMethodKey: row.providerMethodKey,
    discoveryRoute: row.discoveryRoute as Payments.PaymentProviderRouteSnapshot,
    configurationRevision: row.configurationRevision,
    providerDiscoveryRevision: row.providerDiscoveryRevision,
  };
}

export class PaymentMethodBindingRepository
  extends BaseRepository
  implements PaymentMethodBindingsPort, PaymentLifecycleMethodBindingsPort
{
  async resolveCommittedSelection(input: {
    storeId: string;
    checkoutId: string;
    methodHandle: string;
    effectiveAt: string;
  }) {
    const row = (
      await this.connection
        .select({ binding: checkoutMethodBinding })
        .from(checkoutMethodBinding)
        .innerJoin(
          checkoutMethodSnapshot,
          and(
            eq(checkoutMethodSnapshot.storeId, checkoutMethodBinding.storeId),
            eq(checkoutMethodSnapshot.id, checkoutMethodBinding.snapshotId),
          ),
        )
        .where(
          and(
            eq(checkoutMethodBinding.storeId, input.storeId),
            eq(checkoutMethodBinding.checkoutId, input.checkoutId),
            eq(checkoutMethodBinding.targetCheckoutVersion, input.checkoutVersion),
            eq(checkoutMethodBinding.methodHandle, input.methodHandle),
            gt(checkoutMethodSnapshot.retainUntil, input.effectiveAt),
          ),
        )
        .limit(1)
    )[0];
    return row ? binding(row.binding) : null;
  }

  async resolvePaymentSelection(input: {
    storeId: string;
    checkoutId: string;
    finalQuoteRevision: string;
    paymentMethodsRevision: string;
    methodHandle: string;
    effectiveAt: string;
  }) {
    const row = (
      await this.connection
        .select({ binding: checkoutMethodBinding })
        .from(checkoutMethodBinding)
        .innerJoin(
          checkoutMethodSnapshot,
          and(
            eq(checkoutMethodSnapshot.storeId, checkoutMethodBinding.storeId),
            eq(checkoutMethodSnapshot.id, checkoutMethodBinding.snapshotId),
          ),
        )
        .where(
          and(
            eq(checkoutMethodBinding.storeId, input.storeId),
            eq(checkoutMethodBinding.checkoutId, input.checkoutId),
            eq(checkoutMethodBinding.targetCheckoutVersion, input.checkoutVersion),
            eq(checkoutMethodSnapshot.finalQuoteRevision, input.finalQuoteRevision),
            eq(checkoutMethodSnapshot.paymentRevision, input.paymentMethodsRevision),
            eq(checkoutMethodBinding.methodHandle, input.methodHandle),
            gt(checkoutMethodSnapshot.retainUntil, input.effectiveAt),
          ),
        )
        .limit(1)
    )[0];
    return row ? binding(row.binding) : null;
  }

  async stageCheckoutSnapshot(input: {
    storeId: string;
    checkoutId: string;
    finalQuoteRevision: string;
    deliveryRevision: string;
    discoveryRevision: string;
    customizationRevision: string;
    paymentRevision: string;
    result: Payments.GetCheckoutAvailablePaymentMethodsResult;
    methods: readonly PaymentMethodBindingCandidate[];
    executions: readonly {
      kind: "PROVIDER" | "FUNCTION";
      ownerId: string;
      status: string;
      classification: string | null;
      revision: string | null;
      audit: Record<string, unknown>;
    }[];
    retainUntil: string;
  }) {
    try {
      return await this.tx.run(async () => {
        const current = (
          await this.connection
            .select()
            .from(checkoutMethodSnapshot)
            .where(
              and(
                eq(checkoutMethodSnapshot.storeId, input.storeId),
                eq(checkoutMethodSnapshot.checkoutId, input.checkoutId),
                eq(checkoutMethodSnapshot.targetCheckoutVersion, input.targetCheckoutVersion),
              ),
            )
            .limit(1)
            .for("update")
        )[0];
        if (current) {
          if (current.paymentRevision !== input.paymentRevision)
            throw new PaymentsCheckoutError(
              "PAYMENT_DISCOVERY_PERSISTENCE_CONFLICT",
              "Another payment result is already staged for this checkout version.",
              true,
            );
          assertReusableResult(
            current.payload as Payments.GetCheckoutAvailablePaymentMethodsResult,
            input.result,
          );
          return { result: input.result, reused: true };
        }
        const [snapshot] = await this.connection
          .insert(checkoutMethodSnapshot)
          .values({
            storeId: input.storeId,
            checkoutId: input.checkoutId,
            finalQuoteRevision: input.finalQuoteRevision,
            deliveryRevision: input.deliveryRevision,
            discoveryRevision: input.discoveryRevision,
            customizationRevision: input.customizationRevision,
            paymentRevision: input.paymentRevision,
            payload: input.result,
            retainUntil: input.retainUntil,
          })
          .returning();
        if (input.methods.length) {
          const rows = input.methods.map(({ method, binding: value }) => ({
            method,
            value,
            semanticRevision: contentRevision("payment-method-semantic", {
              providerAccountId: value.providerAccountId,
              providerMethodKey: value.providerMethodKey,
              configurationRevision: value.configurationRevision,
              discoveryRouteRevision: value.discoveryRoute.routeRevision,
              providerDiscoveryRevision: value.providerDiscoveryRevision,
            }),
          }));
          await this.connection
            .insert(paymentMethodHandleIdentity)
            .values(
              rows.map(({ value, semanticRevision }) => ({
                storeId: input.storeId,
                checkoutId: input.checkoutId,
                methodHandle: value.methodHandle,
                semanticRevision,
              })),
            )
            .onConflictDoNothing();
          const identities = await this.connection
            .select()
            .from(paymentMethodHandleIdentity)
            .where(
              and(
                eq(paymentMethodHandleIdentity.storeId, input.storeId),
                eq(paymentMethodHandleIdentity.checkoutId, input.checkoutId),
              ),
            );
          const byHandle = new Map(
            identities.map((identity) => [identity.methodHandle, identity.semanticRevision]),
          );
          if (
            rows.some(
              ({ value, semanticRevision }) =>
                byHandle.get(value.methodHandle) !== semanticRevision,
            )
          )
            throw new PaymentsCheckoutError(
              "PAYMENT_DISCOVERY_PERSISTENCE_CONFLICT",
              "A payment method handle cannot be rebound.",
              false,
            );
          await this.connection.insert(checkoutMethodBinding).values(
            rows.map(({ method, value, semanticRevision }) => ({
              snapshotId: snapshot!.id,
              storeId: input.storeId,
              checkoutId: input.checkoutId,
              methodHandle: value.methodHandle,
              method,
              providerAccountId: value.providerAccountId,
              providerCode: value.providerCode,
              providerMethodKey: value.providerMethodKey,
              configurationRevision: value.configurationRevision,
              providerDiscoveryRevision: value.providerDiscoveryRevision,
              discoveryRoute: value.discoveryRoute,
              semanticRevision,
            })),
          );
        }
        if (input.executions.length)
          await this.connection.insert(checkoutMethodExecution).values(
            input.executions.map((execution, sequence) => ({
              snapshotId: snapshot!.id,
              storeId: input.storeId,
              sequence,
              ...execution,
            })),
          );
        return { result: input.result, reused: false };
      });
    } catch (error) {
      if (error instanceof PaymentsCheckoutError) throw error;
      const current = (
        await this.db
          .select()
          .from(checkoutMethodSnapshot)
          .where(
            and(
              eq(checkoutMethodSnapshot.storeId, input.storeId),
              eq(checkoutMethodSnapshot.checkoutId, input.checkoutId),
              eq(checkoutMethodSnapshot.targetCheckoutVersion, input.targetCheckoutVersion),
            ),
          )
          .limit(1)
      )[0];
      if (current?.paymentRevision === input.paymentRevision) {
        assertReusableResult(
          current.payload as Payments.GetCheckoutAvailablePaymentMethodsResult,
          input.result,
        );
        return { result: input.result, reused: true };
      }
      throw new PaymentsCheckoutError(
        "PAYMENT_DISCOVERY_PERSISTENCE_CONFLICT",
        "Payment snapshot staging conflicted with another execution.",
        true,
        { cause: error },
      );
    }
  }
}

function assertReusableResult(
  persisted: Payments.GetCheckoutAvailablePaymentMethodsResult,
  current: Payments.GetCheckoutAvailablePaymentMethodsResult,
): void {
  if (
    canonicalJson(withoutExecutionIdentity(persisted)) !==
    canonicalJson(withoutExecutionIdentity(current))
  ) {
    throw new PaymentsCheckoutError(
      "PAYMENT_DISCOVERY_PERSISTENCE_CONFLICT",
      "The staged payment result does not match its payment revision.",
      false,
    );
  }
}

function withoutExecutionIdentity(
  result: Payments.GetCheckoutAvailablePaymentMethodsResult,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...result };
  delete payload.executionId;
  return payload;
}

export class PaymentsRepository {
  readonly txManager: TransactionManager<PaymentsDatabase>;
  readonly providerAccounts: PaymentProviderAccountRepository;
  readonly customizationBindings: PaymentCustomizationBindingRepository;
  readonly methodBindings: PaymentMethodBindingRepository;
  constructor(readonly db: PaymentsDatabase) {
    this.txManager = new TransactionManager(db);
    this.providerAccounts = new PaymentProviderAccountRepository(db, this.txManager);
    this.customizationBindings = new PaymentCustomizationBindingRepository(db, this.txManager);
    this.methodBindings = new PaymentMethodBindingRepository(db, this.txManager);
  }
}
