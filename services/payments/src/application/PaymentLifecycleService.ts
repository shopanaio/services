import type { Payments } from "@shopana/broker-types";
import type {
  PaymentLifecycleMethodBindingsPort,
  PaymentProviderAccountsPort,
  PaymentsProviderAppsPort,
} from "../contracts/ports.js";
import { PaymentLifecycleActionSchemas } from "../contracts/schemas.js";
import type { PaymentLifecycleRepository, PreparedPaymentSession } from "../infrastructure/db/PaymentLifecycleRepository.js";

export class PaymentLifecycleService {
  constructor(private readonly dependencies: {
    repository: PaymentLifecycleRepository;
    bindings: PaymentLifecycleMethodBindingsPort;
    accounts: PaymentProviderAccountsPort;
    apps: PaymentsProviderAppsPort;
  }) {}

  createCollection(params: Payments.CreatePaymentCollectionParams) {
    const parsed = PaymentLifecycleActionSchemas.createCollection.parse(
      params,
    ) as Payments.CreatePaymentCollectionParams;
    return this.dependencies.repository.createCollection(parsed);
  }

  async prepareSession(
    params: Payments.CreatePaymentSessionParams,
  ): Promise<PreparedPaymentSession> {
    params = PaymentLifecycleActionSchemas.createSession.parse(
      params,
    ) as Payments.CreatePaymentSessionParams;
    const effectiveAt = new Date().toISOString();
    if (Date.parse(params.expiresAt) <= Date.parse(effectiveAt)) {
      throw new Error("PAYMENT_SESSION_EXPIRY_INVALID");
    }
    const binding = await this.dependencies.bindings.resolvePaymentSelection({
      storeId: params.storeId,
      checkoutId: params.checkoutId,
      checkoutVersion: params.expectedCheckoutVersion,
      finalQuoteRevision: params.finalQuoteRevision,
      paymentMethodsRevision: params.paymentMethodsRevision,
      methodHandle: params.methodHandle,
      effectiveAt,
    });
    if (!binding) throw new Error("PAYMENT_METHOD_BINDING_NOT_FOUND");

    const account = await this.dependencies.accounts.getById(
      params.storeId,
      binding.providerAccountId,
    );
    if (!account || account.status !== "ACTIVE") {
      throw new Error("PAYMENT_PROVIDER_ACCOUNT_NOT_ACTIVE");
    }
    const sessionKind: Payments.PaymentSessionKind =
      account.captureMode === "MANUAL" ? "AUTHORIZATION" : "SALE";
    if (
      account.organizationId !== params.organizationId ||
      account.configurationRevision !== binding.configurationRevision ||
      !account.supportedCurrencyCodes.includes(params.amount.currencyCode) ||
      !account.supportedSessionKinds.includes(sessionKind) ||
      !account.supportedOperations.includes("createPayment")
    ) {
      throw new Error("PAYMENT_METHOD_BINDING_STALE");
    }
    const route = await this.dependencies.apps.resolveRoute({
      storeId: params.storeId,
      installationId: account.installationId,
      operation: "createPayment",
    });
    if (
      !route ||
      route.installationId !== account.installationId ||
      route.appCode !== account.appCode ||
      route.appVersion !== account.appVersion
    ) {
      throw new Error("PAYMENT_PROVIDER_ROUTE_UNAVAILABLE");
    }

    return this.dependencies.repository.prepareSession({
      params: { ...params, kind: sessionKind },
      binding,
      route,
      requestedAt: effectiveAt,
      deadlineAt: new Date(Date.parse(effectiveAt) + 120_000).toISOString(),
    });
  }

  async invokeProvider(prepared: PreparedPaymentSession) {
    const route = await this.dependencies.apps.resolveRoute({
      storeId: prepared.session.storeId,
      installationId: prepared.route.installationId,
      operation: "createPayment",
    });
    if (
      !route ||
      route.capabilityRouteId !== prepared.route.capabilityRouteId ||
      route.installationId !== prepared.route.installationId ||
      route.operation !== prepared.route.operation ||
      route.routeRevision !== prepared.route.routeRevision ||
      route.appCode !== prepared.route.appCode ||
      route.appVersion !== prepared.route.appVersion
    ) {
      throw new Error("PAYMENT_PROVIDER_ROUTE_CHANGED");
    }
    return this.dependencies.apps.createPayment(route, prepared.request);
  }

  completeInitialOperation(
    prepared: PreparedPaymentSession,
    result: Payments.PaymentProviderOperationResult,
  ) {
    return this.dependencies.repository.completeInitialOperation(prepared, result);
  }

  getCollection(params: Payments.GetPaymentCollectionParams) {
    return this.dependencies.repository.getCollection(params);
  }

  getSession(params: Payments.GetPaymentSessionParams) {
    return this.dependencies.repository.getSession(params);
  }

  expireSession(params: Payments.ExpirePaymentParams) {
    const parsed = PaymentLifecycleActionSchemas.expire.parse(
      params,
    ) as Payments.ExpirePaymentParams;
    return this.dependencies.repository.expireSession(
      parsed,
      new Date().toISOString(),
    );
  }
}
