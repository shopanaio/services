import { Injectable } from "@nestjs/common";
import type {
  ActiveAppContextResolutionReference,
  AppContextResolutionReference,
  AppExecutionContext,
  AppInstallationContextProvider,
  AppInstallationStatus,
} from "@shopana/app-sdk";
import type { GetCurrentStoreResult } from "@shopana/shared-context";
import {
  InjectBroker,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { AppInstallationStore } from "../control-plane/AppInstallationStore.js";
import type { AppInstallationRecord } from "../control-plane/types.js";

export const APP_INSTALLATION_CONTEXT_PROVIDER = Symbol(
  "APP_INSTALLATION_CONTEXT_PROVIDER",
);

@Injectable()
export class DatabaseAppInstallationContextProvider
  implements AppInstallationContextProvider
{
  constructor(
    private readonly installations: AppInstallationStore,
    @InjectBroker("apps") private readonly broker: ServiceBroker,
  ) {}

  async resolve(
    reference: Readonly<AppContextResolutionReference>,
  ): Promise<Readonly<AppExecutionContext>> {
    const installation = await this.installations.findById(
      reference.installationId,
    );
    if (!installation) {
      throw new Error(
        `App installation "${reference.installationId}" not found`,
      );
    }
    if (installation.appCode !== reference.appCode) {
      throw new Error("App installation does not belong to this App");
    }

    return this.createContext(installation, reference);
  }

  async resolveActive(
    reference: Readonly<ActiveAppContextResolutionReference>,
  ): Promise<Readonly<AppExecutionContext>> {
    const storeResult = await this.broker.call<
      GetCurrentStoreResult,
      { name: string }
    >("project.getCurrentStore", { name: reference.storeName });
    const store = storeResult?.store;
    if (!store) {
      throw new Error(`Store "${reference.storeName}" not found`);
    }

    const installation =
      await this.installations.findNonTerminalByStoreAndApp(
        store.id,
        reference.appCode,
      );
    if (!installation || installation.status !== "ACTIVE") {
      throw new Error(
        `Active App installation for "${reference.appCode}" was not found`,
      );
    }
    if (installation.organizationId !== store.organizationId) {
      throw new Error("App installation organization mismatch");
    }

    return this.createContext(installation, reference);
  }

  private async createContext(
    installation: AppInstallationRecord,
    reference: Readonly<
      AppContextResolutionReference | ActiveAppContextResolutionReference
    >,
  ): Promise<Readonly<AppExecutionContext>> {
    const effectiveVersion =
      installation.targetVersion ?? installation.installedVersion;
    if (effectiveVersion !== reference.appVersion) {
      throw new Error(
        `App installation version mismatch: expected "${reference.appVersion}", received "${effectiveVersion}"`,
      );
    }

    let actor: AppExecutionContext["actor"] = { type: "SYSTEM" };
    let correlationId: string | undefined;
    const operationId =
      "operationId" in reference ? reference.operationId : undefined;
    if (operationId) {
      const operation = await this.installations.findOperationById(
        operationId,
      );
      if (
        !operation ||
        operation.installationId !== installation.id ||
        (operation.status !== "PENDING" && operation.status !== "RUNNING")
      ) {
        throw new Error(
          `App lifecycle operation "${operationId}" is not active`,
        );
      }
      const allowedStatuses = operationAllowedStatuses(operation.type);
      if (!allowedStatuses.includes(installation.status)) {
        throw new Error(
          `App installation status "${installation.status}" does not allow ${operation.type}`,
        );
      }
      actor = {
        type: operation.actorType,
        ...(operation.actorId ? { id: operation.actorId } : {}),
      };
      correlationId = operation.correlationId ?? undefined;
    } else if (installation.status !== "ACTIVE") {
      throw new Error(
        `App installation "${installation.id}" is not active`,
      );
    }

    const grantedScopes =
      await this.installations.listGrantedScopes(installation.id);
    return Object.freeze({
      appCode: installation.appCode,
      installationId: installation.id,
      organizationId: installation.organizationId,
      storeId: installation.storeId,
      appVersion: reference.appVersion,
      grantedScopes,
      operationId,
      actor,
      correlationId,
    });
  }
}

function operationAllowedStatuses(
  type: "INSTALL" | "UPDATE" | "SUSPEND" | "RESUME" | "UNINSTALL",
): readonly AppInstallationStatus[] {
  switch (type) {
    case "INSTALL":
      return ["INSTALLING", "INSTALL_FAILED"];
    case "UPDATE":
      return ["UPDATING", "UPDATE_FAILED"];
    case "SUSPEND":
      return ["SUSPENDING"];
    case "RESUME":
      return ["RESUMING"];
    case "UNINSTALL":
      return ["UNINSTALLING", "UNINSTALL_FAILED"];
  }
}
