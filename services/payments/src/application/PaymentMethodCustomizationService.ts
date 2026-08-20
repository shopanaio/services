import {
  PAYMENT_CUSTOMIZATION_MAX_EXECUTIONS,
  PAYMENT_CUSTOMIZATION_MAX_OPERATIONS,
  type Payments,
} from "@shopana/broker-types";
import { contentRevision } from "../checkout-pipeline/canonicalJson.js";
import type {
  PaymentCustomizationBindingsPort,
  PaymentFunctionRoutesPort,
} from "../contracts/ports.js";

export const PAYMENT_METHOD_CUSTOMIZATION_POLICY_REVISION = contentRevision(
  "payment-customization-policy",
  {
    contractVersion: 1,
    allowHideAllMethods: false,
    maxExecutions: PAYMENT_CUSTOMIZATION_MAX_EXECUTIONS,
    maxOperations: PAYMENT_CUSTOMIZATION_MAX_OPERATIONS,
    operations: ["HIDE", "MOVE", "RENAME"],
    ordering: ["precedence", "activationSequence", "functionBindingId"],
  },
);

export class PaymentMethodCustomizationService {
  constructor(
    private readonly dependencies: {
      bindings: PaymentCustomizationBindingsPort;
      routes: PaymentFunctionRoutesPort;
    },
  ) {}

  async configure(
    params: Payments.ConfigurePaymentMethodCustomizationParams,
  ): Promise<Payments.ConfigurePaymentMethodCustomizationResult> {
    if (params.customizationStatus === "ACTIVE") {
      const existing = await this.dependencies.bindings.listForCustomization({
        storeId: params.storeId,
        customizationId: params.customizationId,
      });
      const activeBindings = [
        ...existing.filter(
          (binding) =>
            binding.functionBindingId !== params.functionBindingId && binding.status === "ACTIVE",
        ),
        ...(params.bindingStatus === "ACTIVE" ? [params] : []),
      ];
      if (activeBindings.length === 0) {
        throw new Error("PAYMENT_CUSTOMIZATION_BINDING_NOT_ACTIVE");
      }
      await Promise.all(activeBindings.map((binding) => this.confirmBindingRoute(binding)));
    } else {
      await this.confirmBindingRoute(params);
    }
    return this.dependencies.bindings.configure({
      ...params,
      policyRevision: PAYMENT_METHOD_CUSTOMIZATION_POLICY_REVISION,
    });
  }

  async setStatus(
    params: Payments.SetPaymentMethodCustomizationStatusParams,
  ): Promise<Payments.SetPaymentMethodCustomizationStatusResult> {
    if (params.status === "ACTIVE") {
      const bindings = await this.dependencies.bindings.listForCustomization({
        storeId: params.storeId,
        customizationId: params.customizationId,
      });
      if (bindings.length === 0) {
        throw new Error("PAYMENT_CUSTOMIZATION_BINDING_NOT_FOUND");
      }
      await Promise.all(
        bindings
          .filter((binding) => binding.status === "ACTIVE")
          .map((binding) => this.confirmBindingRoute(binding)),
      );
      if (!bindings.some((binding) => binding.status === "ACTIVE")) {
        throw new Error("PAYMENT_CUSTOMIZATION_BINDING_NOT_ACTIVE");
      }
    }
    const customization = await this.dependencies.bindings.setStatus(params);
    if (!customization) throw new Error("PAYMENT_CUSTOMIZATION_NOT_FOUND");
    return { customization };
  }

  private async confirmBindingRoute(input: {
    storeId: string;
    installationId: string;
    functionKey: string;
    routeRevision: string;
  }): Promise<void> {
    const route = await this.dependencies.routes.resolveRoute({
      storeId: input.storeId,
      installationId: input.installationId,
      functionKey: input.functionKey,
    });
    if (!route) throw new Error("PAYMENT_CUSTOMIZATION_ROUTE_UNAVAILABLE");
    if (route.routeRevision !== input.routeRevision) {
      throw new Error("PAYMENT_CUSTOMIZATION_ROUTE_REVISION_MISMATCH");
    }
  }
}
