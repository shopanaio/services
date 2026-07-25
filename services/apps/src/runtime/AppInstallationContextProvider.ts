import { Injectable } from "@nestjs/common";
import type {
  AppContextResolutionReference,
  AppExecutionContext,
  AppInstallationContextProvider,
  AppInstallationStatus,
} from "@shopana/app-sdk";
import { AppInstallationsRepository } from "../control-plane/AppInstallationsRepository.js";

export const APP_INSTALLATION_CONTEXT_PROVIDER = Symbol(
  "APP_INSTALLATION_CONTEXT_PROVIDER",
);

@Injectable()
export class DatabaseAppInstallationContextProvider
  implements AppInstallationContextProvider
{
  constructor(
    private readonly installations: AppInstallationsRepository,
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

    const effectiveVersion =
      installation.targetVersion ?? installation.installedVersion;
    if (effectiveVersion !== reference.appVersion) {
      throw new Error(
        `App installation version mismatch: expected "${reference.appVersion}", received "${effectiveVersion}"`,
      );
    }

    let actor: AppExecutionContext["actor"] = { type: "SYSTEM" };
    let correlationId: string | undefined;
    if (reference.operationId) {
      const operation = await this.installations.findOperationById(
        reference.operationId,
      );
      if (
        !operation ||
        operation.installationId !== installation.id ||
        (operation.status !== "PENDING" && operation.status !== "RUNNING")
      ) {
        throw new Error(
          `App lifecycle operation "${reference.operationId}" is not active`,
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
      operationId: reference.operationId,
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
