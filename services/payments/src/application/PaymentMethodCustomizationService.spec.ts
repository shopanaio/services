import type { Apps, Payments } from "@shopana/broker-types";
import type {
  PaymentCustomizationBindingsPort,
  PaymentFunctionRoutesPort,
} from "../contracts/ports.js";
import {
  PAYMENT_METHOD_CUSTOMIZATION_POLICY_REVISION,
  PaymentMethodCustomizationService,
} from "./PaymentMethodCustomizationService.js";

describe("PaymentMethodCustomizationService", () => {
  it("persists a binding only after confirming its exact Apps route", async () => {
    const configure = jest.fn(async () => configuredResult());
    const routes = routePort(route());
    const service = new PaymentMethodCustomizationService({
      bindings: bindingsPort({ configure }),
      routes,
    });

    await service.configure(params());

    expect(routes.resolveRoute).toHaveBeenCalledWith({
      storeId: STORE_ID,
      installationId: INSTALLATION_ID,
      functionKey: "payments.transform",
    });
    expect(configure).toHaveBeenCalledWith({
      ...params(),
      policyRevision: PAYMENT_METHOD_CUSTOMIZATION_POLICY_REVISION,
    });
  });

  it("rejects a stale route revision without writing business activation", async () => {
    const configure = jest.fn(async () => configuredResult());
    const service = new PaymentMethodCustomizationService({
      bindings: bindingsPort({ configure }),
      routes: routePort(route({ routeRevision: "route-v2" })),
    });

    await expect(service.configure(params())).rejects.toThrow(
      "PAYMENT_CUSTOMIZATION_ROUTE_REVISION_MISMATCH",
    );
    expect(configure).not.toHaveBeenCalled();
  });

  it("reconfirms every active binding before activating its owner", async () => {
    const binding = configuredResult().binding;
    const setStatus = jest.fn(async () => configuredResult().customization);
    const routes = routePort(route());
    const service = new PaymentMethodCustomizationService({
      bindings: bindingsPort({
        listForCustomization: jest.fn(async () => [binding]),
        setStatus,
      }),
      routes,
    });

    await service.setStatus({
      storeId: STORE_ID,
      customizationId: CUSTOMIZATION_ID,
      status: "ACTIVE",
    });

    expect(routes.resolveRoute).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith({
      storeId: STORE_ID,
      customizationId: CUSTOMIZATION_ID,
      status: "ACTIVE",
    });
  });
});

const STORE_ID = "00000000-0000-0000-0000-000000000001";
const CUSTOMIZATION_ID = "00000000-0000-0000-0000-000000000002";
const BINDING_ID = "00000000-0000-0000-0000-000000000003";
const INSTALLATION_ID = "00000000-0000-0000-0000-000000000004";

function params(): Payments.ConfigurePaymentMethodCustomizationParams {
  return {
    storeId: STORE_ID,
    customizationId: CUSTOMIZATION_ID,
    functionBindingId: BINDING_ID,
    installationId: INSTALLATION_ID,
    functionKey: "payments.transform",
    contractVersion: 1,
    precedence: 10,
    activationSequence: 20,
    failureMode: "OPTIONAL",
    configurationSnapshot: {},
    configurationRevision: "configuration-v1",
    routeRevision: "route-v1",
    customizationStatus: "ACTIVE",
    bindingStatus: "ACTIVE",
  };
}

function route(
  overrides: Partial<Apps.CapabilityRoute> = {},
): Apps.CapabilityRoute {
  return {
    capabilityRouteId: "capability-route-1",
    installationId: INSTALLATION_ID,
    appCode: "payment-customizer",
    appVersion: "1.0.0",
    functionKey: "payments.transform",
    routeRevision: "route-v1",
    ...overrides,
  };
}

function routePort(value: Apps.CapabilityRoute): PaymentFunctionRoutesPort {
  return { resolveRoute: jest.fn(async () => value) };
}

function bindingsPort(
  overrides: Partial<PaymentCustomizationBindingsPort> = {},
): PaymentCustomizationBindingsPort {
  return {
    listActive: jest.fn(async () => ({
      policyRevision: PAYMENT_METHOD_CUSTOMIZATION_POLICY_REVISION,
      bindingSetRevision: "bindings-v1",
      bindings: [],
    })),
    listForCustomization: jest.fn(async () => []),
    configure: jest.fn(async () => configuredResult()),
    setStatus: jest.fn(async () => configuredResult().customization),
    ...overrides,
  };
}

function configuredResult(): Payments.ConfigurePaymentMethodCustomizationResult {
  const timestamp = "2026-08-02T00:00:00.000Z";
  return {
    customization: {
      customizationId: CUSTOMIZATION_ID,
      storeId: STORE_ID,
      status: "ACTIVE",
      policyRevision: PAYMENT_METHOD_CUSTOMIZATION_POLICY_REVISION,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    binding: {
      functionBindingId: BINDING_ID,
      storeId: STORE_ID,
      customizationId: CUSTOMIZATION_ID,
      installationId: INSTALLATION_ID,
      functionKey: "payments.transform",
      contractVersion: 1,
      precedence: 10,
      activationSequence: 20,
      failureMode: "OPTIONAL",
      configurationSnapshot: {},
      configurationRevision: "configuration-v1",
      routeRevision: "route-v1",
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}
