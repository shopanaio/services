import { Injectable } from "@nestjs/common";
import {
  CustomerExternalReferenceActionNames,
  CustomerExternalReferenceAppScopes,
  type Customers,
} from "@shopana/broker-types";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  ZodSchema,
  type BrokerAppContext,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import type { CustomerExternalReference } from "../repositories/models/index.js";
import type {
  CustomerExternalReferenceSyncWorkflowInput,
  CustomerExternalReferenceSyncWorkflowResult,
} from "../workflows/dto/index.js";
import {
  deleteCustomerExternalReferenceParamsSchema,
  lookupCustomerExternalReferenceParamsSchema,
  syncCustomerExternalReferencesParamsSchema,
  upsertCustomerExternalReferenceParamsSchema,
} from "./customerExternalReferenceSchemas.js";

type AppAccessResult =
  | { ok: true; app: Readonly<BrokerAppContext> }
  | Customers.CustomerExternalReferenceActionFailure;

@Injectable()
export class CustomerExternalReferenceBrokerActions extends BrokerActions {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Action(CustomerExternalReferenceActionNames.lookup, { readOnly: true })
  @ZodSchema(lookupCustomerExternalReferenceParamsSchema)
  async lookup(
    params: Customers.LookupCustomerExternalReferenceParams,
    callContext: BrokerCallContext
  ): Promise<Customers.LookupCustomerExternalReferenceResult> {
    const access = this.assertAppAccess(
      callContext,
      params.storeId,
      CustomerExternalReferenceAppScopes.read
    );
    if (!access.ok) return access;

    try {
      const kernel = Kernel.getInstance();
      const serviceContext = createServiceContext(kernel, access.app);
      const reference = await runWithContext(serviceContext, () =>
        kernel.repository.externalReference.findByExternalKey({
          externalSystem: access.app.appCode,
          externalType: params.externalType,
          externalId: params.externalId,
        })
      );
      return {
        ok: true,
        reference: reference ? toSnapshot(reference) : null,
      };
    } catch (error) {
      this.logger.error(
        { error, appCode: access.app.appCode },
        "Customer external reference lookup failed"
      );
      return syncFailure();
    }
  }

  @Action(CustomerExternalReferenceActionNames.upsert)
  @ZodSchema(upsertCustomerExternalReferenceParamsSchema)
  async upsert(
    params: Customers.UpsertCustomerExternalReferenceParams,
    callContext: BrokerCallContext
  ): Promise<Customers.UpsertCustomerExternalReferenceResult> {
    const access = this.assertAppAccess(
      callContext,
      params.storeId,
      CustomerExternalReferenceAppScopes.write
    );
    if (!access.ok) return access;

    try {
      const workflow = await this.runSyncWorkflow(
        access.app,
        `upsert:${params.idempotencyKey}`,
        [
          {
            type: "UPSERT",
            customerId: params.customerId,
            externalType: params.externalType,
            externalId: params.externalId,
            metadata: params.metadata,
            conflictPolicy: params.conflictPolicy,
          },
        ]
      );
      const result = workflow.results[0];
      if (!result?.applied || !result.reference || !result.outcome) {
        return operationFailure(result?.userErrors);
      }
      return {
        ok: true,
        reference: result.reference,
        outcome: result.outcome,
        previousCustomerId: result.previousCustomerId,
      };
    } catch (error) {
      this.logger.error(
        { error, appCode: access.app.appCode },
        "Customer external reference upsert failed"
      );
      return syncFailure();
    }
  }

  @Action(CustomerExternalReferenceActionNames.delete)
  @ZodSchema(deleteCustomerExternalReferenceParamsSchema)
  async delete(
    params: Customers.DeleteCustomerExternalReferenceParams,
    callContext: BrokerCallContext
  ): Promise<Customers.DeleteCustomerExternalReferenceResult> {
    const access = this.assertAppAccess(
      callContext,
      params.storeId,
      CustomerExternalReferenceAppScopes.write
    );
    if (!access.ok) return access;

    try {
      const workflow = await this.runSyncWorkflow(
        access.app,
        `delete:${params.idempotencyKey}`,
        [
          {
            type: "DELETE",
            externalType: params.externalType,
            externalId: params.externalId,
          },
        ]
      );
      const result = workflow.results[0];
      if (!result?.applied) return operationFailure(result?.userErrors);
      return {
        ok: true,
        deletedReferenceId: result.deletedReferenceId ?? null,
        customerId: result.customerId ?? null,
      };
    } catch (error) {
      this.logger.error(
        { error, appCode: access.app.appCode },
        "Customer external reference delete failed"
      );
      return syncFailure();
    }
  }

  @Action(CustomerExternalReferenceActionNames.sync)
  @ZodSchema(syncCustomerExternalReferencesParamsSchema)
  async sync(
    params: Customers.SyncCustomerExternalReferencesParams,
    callContext: BrokerCallContext
  ): Promise<Customers.SyncCustomerExternalReferencesResult> {
    const access = this.assertAppAccess(
      callContext,
      params.storeId,
      CustomerExternalReferenceAppScopes.write
    );
    if (!access.ok) return access;

    try {
      const result = await this.runSyncWorkflow(
        access.app,
        `sync:${params.syncId}`,
        params.operations
      );
      return { ok: true, ...result };
    } catch (error) {
      this.logger.error(
        { error, appCode: access.app.appCode },
        "Customer external reference sync failed"
      );
      return syncFailure();
    }
  }

  private runSyncWorkflow(
    app: Readonly<BrokerAppContext>,
    clientKey: string,
    operations: readonly Customers.CustomerExternalReferenceSyncOperation[]
  ): Promise<CustomerExternalReferenceSyncWorkflowResult> {
    return this.broker.runWorkflow<
      CustomerExternalReferenceSyncWorkflowResult,
      CustomerExternalReferenceSyncWorkflowInput
    >(
      "customers.customerExternalReferenceSync",
      {
        context: {
          organizationId: app.organizationId,
          storeId: app.storeId,
          appCode: app.appCode,
          installationId: app.installationId,
          requestId:
            app.correlationId ??
            `customers-external-reference-${app.installationId}-${clientKey}`,
        },
        operations,
      },
      {
        source: "client",
        clientKey,
        organizationId: app.organizationId,
        apiKeyId: app.installationId,
      }
    );
  }

  private assertAppAccess(
    callContext: BrokerCallContext,
    storeId: string,
    scope: string
  ): AppAccessResult {
    if (
      callContext.caller.kind !== "action" ||
      callContext.caller.service !== "apps" ||
      !callContext.app
    ) {
      return {
        ok: false,
        code: "CUSTOMER_EXTERNAL_REFERENCE_APP_REQUIRED",
        message: "A trusted App installation context is required",
        retryable: false,
      };
    }
    if (callContext.app.storeId !== storeId) {
      return {
        ok: false,
        code: "CUSTOMER_EXTERNAL_REFERENCE_STORE_FORBIDDEN",
        message: "App installation cannot access another store",
        retryable: false,
      };
    }
    if (!callContext.app.grantedScopes.includes(scope)) {
      return {
        ok: false,
        code: "CUSTOMER_EXTERNAL_REFERENCE_SCOPE_FORBIDDEN",
        message: `App installation requires the ${scope} scope`,
        retryable: false,
      };
    }
    return { ok: true, app: callContext.app };
  }
}

function createServiceContext(
  kernel: Kernel,
  app: Readonly<BrokerAppContext>
): ServiceContext {
  return new ServiceContext({
    requestId:
      app.correlationId ??
      `customers-external-reference-lookup-${app.installationId}`,
    kernel,
    loaders: new Loader(kernel.repository),
    store: {
      id: app.storeId,
      name: app.storeId,
      displayName: app.storeId,
      organizationId: app.organizationId,
      timezone: "UTC",
      email: null,
      defaultLocale: "",
      currencyCode: "",
      locales: [],
    },
  });
}

function toSnapshot(
  reference: CustomerExternalReference
): Customers.CustomerExternalReferenceSnapshot {
  return {
    id: reference.id,
    storeId: reference.storeId,
    customerId: reference.customerId,
    externalSystem: reference.externalSystem,
    externalType: reference.externalType,
    externalId: reference.externalId,
    metadata: reference.metadata as Record<string, unknown>,
    createdAt: reference.createdAt,
    updatedAt: reference.updatedAt,
  };
}

function operationFailure(
  errors:
    | readonly { message: string; code?: string }[]
    | undefined
): Customers.CustomerExternalReferenceActionFailure {
  const error = errors?.[0];
  const code = error?.code;
  switch (code) {
    case "CUSTOMER_EXTERNAL_REFERENCE_NOT_FOUND":
    case "CUSTOMER_NOT_FOUND":
    case "EXTERNAL_REFERENCE_CONFLICT":
    case "CUSTOMER_EXTERNAL_REFERENCE_CONFLICT":
    case "INVALID_EXTERNAL_REFERENCE":
      return {
        ok: false,
        code,
        message: error?.message ?? "Customer external reference operation failed",
        retryable: false,
      };
    default:
      return syncFailure(error?.message);
  }
}

function syncFailure(
  message = "Customer external references could not be synchronized"
): Customers.CustomerExternalReferenceActionFailure {
  return {
    ok: false,
    code: "CUSTOMER_EXTERNAL_REFERENCE_SYNC_FAILED",
    message,
    retryable: true,
  };
}
