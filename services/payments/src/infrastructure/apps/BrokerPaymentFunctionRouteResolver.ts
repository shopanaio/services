import {
  COMMERCE_FUNCTION_CAPABILITY,
  PAYMENT_METHOD_CUSTOMIZATION_FUNCTION_TARGET,
  type Apps,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { PaymentFunctionRoutesPort } from "../../contracts/ports.js";

export class BrokerPaymentFunctionRouteResolver
  implements PaymentFunctionRoutesPort
{
  constructor(private readonly broker: ServiceBroker) {}

  async resolveRoute(input: {
    storeId: string;
    installationId: string;
    functionKey: string;
  }): Promise<Apps.CapabilityRoute | null> {
    const result = await this.broker.call<
      Apps.ListCapabilityRoutesResult,
      Apps.ListCapabilityRoutesParams
    >("apps.listCapabilityRoutes", {
      storeId: input.storeId,
      capability: COMMERCE_FUNCTION_CAPABILITY,
      operation: PAYMENT_METHOD_CUSTOMIZATION_FUNCTION_TARGET,
    });
    const matches = result.routes.filter(
      (route) =>
        route.installationId === input.installationId &&
        route.functionKey === input.functionKey,
    );
    return matches.length === 1 ? matches[0]! : null;
  }
}
