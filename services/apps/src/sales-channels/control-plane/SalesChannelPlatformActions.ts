import { Injectable } from "@nestjs/common";
import type { Apps } from "@shopana/broker-types";
import {
  Action,
  BrokerActions,
  InjectBroker,
  type BrokerCallContext,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { Repository } from "../../repositories/Repository.js";
import { SalesChannelRuntimeRouter } from "../runtime/SalesChannelRuntimeRouter.js";

@Injectable()
export class SalesChannelPlatformActions extends BrokerActions {
  constructor(
    @InjectBroker("apps") broker: ServiceBroker,
    private readonly repository: Repository,
    private readonly router: SalesChannelRuntimeRouter,
  ) {
    super(broker);
  }

  @Action("apps.salesChannels.resolveConnection")
  async resolveConnection(
    params: Apps.ResolveSalesChannelConnectionParams,
    context: BrokerCallContext,
  ): Promise<Apps.ResolvedSalesChannelConnection | null> {
    assertTrustedCaller(context);
    const resolved =
      await this.repository.salesChannelConnection.resolveActive(
        required(params.connectionId, "connectionId"),
        params.storeId,
      );
    if (!resolved || !resolved.appVersion) return null;
    const specification =
      await this.repository.salesChannelSpecification.findById(
        resolved.connection.specificationSnapshotId,
      );
    if (!specification) return null;
    assertAppOwnership(context, resolved.connection.installationId);
    return {
      id: resolved.connection.id,
      organizationId: resolved.connection.organizationId,
      storeId: resolved.connection.storeId,
      installationId: resolved.connection.installationId,
      appCode: resolved.appCode,
      appVersion: resolved.appVersion,
      specificationHandle: specification.handle,
      status: "ACTIVE",
    };
  }

  @Action("apps.salesChannels.listConnections")
  async listConnections(
    params: Apps.ListSalesChannelConnectionsParams,
    context: BrokerCallContext,
  ): Promise<Apps.ResolvedSalesChannelConnection[]> {
    assertTrustedCaller(context);
    const connections =
      await this.repository.salesChannelConnection.listByStore(
        required(params.storeId, "storeId"),
        undefined,
      );
    const result: Apps.ResolvedSalesChannelConnection[] = [];
    for (const connection of connections) {
      if (
        params.installationId &&
        connection.installationId !== params.installationId
      ) {
        continue;
      }
      const resolved = await this.resolveConnection(
        { connectionId: connection.id, storeId: params.storeId },
        context,
      );
      if (resolved) result.push(resolved);
    }
    return result;
  }

  @Action("apps.salesChannels.invokeConnection")
  invokeConnection(
    params: Apps.InvokeSalesChannelConnectionParams,
    context: BrokerCallContext,
  ): Promise<unknown> {
    assertTrustedCaller(context);
    return this.router.invokeForConnection(
      required(params.connectionId, "connectionId"),
      params.contract,
      params.input,
      { correlationId: params.correlationId },
    );
  }

  @Action("apps.salesChannels.resolveOnlineStore")
  async resolveOnlineStore(
    params: Apps.ResolveOnlineStoreParams,
    context: BrokerCallContext,
  ): Promise<{ connectionId: string } | null> {
    assertTrustedCaller(context);
    const connections =
      await this.repository.salesChannelConnection.listByStore(
        required(params.storeId, "storeId"),
        ["ACTIVE"],
      );
    for (const connection of connections) {
      const installation = await this.repository.installation.findById(
        connection.installationId,
      );
      if (
        installation?.appCode !== "shopana-online-store" ||
        installation.status !== "ACTIVE"
      ) {
        continue;
      }
      const specification =
        await this.repository.salesChannelSpecification.findById(
          connection.specificationSnapshotId,
        );
      if (specification?.handle === "online-store") {
        return { connectionId: connection.id };
      }
    }
    return null;
  }

  @Action("apps.salesChannels.getSpecification")
  async getSpecification(
    params: Apps.GetSalesChannelSpecificationParams,
    context: BrokerCallContext,
  ): Promise<Apps.SalesChannelSpecificationResult | null> {
    assertTrustedCaller(context);
    const specification =
      await this.repository.salesChannelSpecification.findById(
        required(params.specificationId, "specificationId"),
      );
    if (!specification) return null;
    const installation = await this.repository.installation.findById(
      specification.installationId,
    );
    if (!installation || (params.storeId && installation.storeId !== params.storeId)) {
      return null;
    }
    assertAppOwnership(context, installation.id);
    return {
      id: specification.id,
      appCode: specification.appCode,
      appVersion: specification.appVersion,
      handle: specification.handle,
      label: specification.label,
      definition: { ...specification.definition },
    };
  }

  @Action("apps.salesChannels.resolveConnectionDetails")
  async resolveConnectionDetails(
    params: Apps.ResolveSalesChannelConnectionParams,
    context: BrokerCallContext,
  ): Promise<{ specificationId: string } | null> {
    const resolved = await this.resolveConnection(params, context);
    if (!resolved) return null;
    const connection =
      await this.repository.salesChannelConnection.findById(resolved.id);
    return connection
      ? { specificationId: connection.specificationSnapshotId }
      : null;
  }
}

function assertTrustedCaller(context: BrokerCallContext): void {
  if (context.caller.kind !== "action") {
    throw new Error("Sales channel broker actions require an action caller");
  }
}

function assertAppOwnership(
  context: BrokerCallContext,
  installationId: string,
): void {
  if (context.app && context.app.installationId !== installationId) {
    throw new Error("App cannot access another installation's connection");
  }
}

function required(value: string, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}
