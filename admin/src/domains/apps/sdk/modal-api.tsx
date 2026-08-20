import type { ComponentType } from "react";
import { lazy } from "react";
import { modalStackRegistry, useModalStackContext, useModalStackStore } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { AdminAppUiDescriptor } from "../runtime/descriptor-schema";
import { loadAdminAppRemoteModule } from "../runtime/federation/load-remote-module";
import type {
  AdminAppModalApi,
  AdminAppModalProps,
  AdminAppSdk,
  AdminModalResult,
  CoreModalContractMap,
} from "./contracts";
import { CORE_MODAL_TYPES } from "./core-modals";

interface AppModalPayload extends IModalStackPayload {
  __adminAppPayload: unknown;
  __adminAppResolve: (result: AdminModalResult<unknown>) => void;
}

const appModalType = (owner: string, modalId: string): string => `${owner}:${modalId}`;

export function registerAdminAppModals(
  descriptor: AdminAppUiDescriptor,
  owner: string,
  getSdk: () => AdminAppSdk,
): void {
  descriptor.modals.forEach((modalDescriptor) => {
    const RemoteModal = lazy(async () => {
      const remoteModule = await loadAdminAppRemoteModule(descriptor, modalDescriptor.module);
      return {
        default: remoteModule.default as ComponentType<AdminAppModalProps>,
      };
    });

    function ScopedAdminAppModal() {
      const { payload } = useModalStackContext();
      const appPayload = payload as AppModalPayload;
      return <RemoteModal sdk={getSdk()} payload={appPayload.__adminAppPayload} />;
    }

    modalStackRegistry.register({
      type: appModalType(owner, modalDescriptor.id),
      owner,
      component: ScopedAdminAppModal,
      confirmOnDirtyClose: modalDescriptor.confirmOnDirtyClose,
      closeConfirmMessage: modalDescriptor.closeConfirmMessage,
    });
  });
}

export function unregisterAdminAppModals(owner: string): void {
  useModalStackStore.getState().closeByOwner(owner);
  modalStackRegistry.unregisterByOwner(owner);
}

export function createAdminAppModalApi(
  descriptor: AdminAppUiDescriptor,
  owner: string,
): AdminAppModalApi {
  const resolveAndPop = <TResult,>(result: AdminModalResult<TResult>): void => {
    const store = useModalStackStore.getState();
    const current = store.peek();
    if (!current || current.owner !== owner) {
      return;
    }
    const payload = current.payload as AppModalPayload;
    payload.__adminAppResolve(result as AdminModalResult<unknown>);
    store.pop(current.uuid);
  };

  return {
    openApp: <TPayload, TResult>(modalId: string, payload: TPayload) => {
      const definition = descriptor.modals.find((modal) => modal.id === modalId);
      if (!definition) {
        return Promise.reject(
          new Error(`App modal "${descriptor.appCode}:${modalId}" is not declared`),
        );
      }

      const missingScope = definition.requiredScopes.find(
        (scope) => !descriptor.grantedScopes.includes(scope),
      );
      if (missingScope) {
        return Promise.reject(new Error(`App modal "${modalId}" requires scope "${missingScope}"`));
      }

      return new Promise<AdminModalResult<TResult>>((resolve) => {
        let settled = false;
        const settle = (result: AdminModalResult<unknown>) => {
          if (settled) return;
          settled = true;
          resolve(result as AdminModalResult<TResult>);
        };
        useModalStackStore.getState().push(
          appModalType(owner, modalId),
          {
            __adminAppPayload: payload,
            __adminAppResolve: settle,
          },
          {
            owner,
            onRemoved: (reason) => settle({ status: "cancelled", reason }),
          },
        );
      });
    },
    openCore: <TKey extends keyof CoreModalContractMap>(
      modal: TKey,
      input: CoreModalContractMap[TKey]["input"],
    ) => {
      return new Promise<AdminModalResult<CoreModalContractMap[TKey]["result"]>>((resolve) => {
        let settled = false;
        const settle = (result: AdminModalResult<CoreModalContractMap[TKey]["result"]>) => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        const basePayload: IModalStackPayload = {};

        if (modal === "catalog.product.details") {
          const details = input as CoreModalContractMap["catalog.product.details"]["input"];
          Object.assign(basePayload, {
            entityId: details.productId,
            mode: details.mode ?? "view",
          });
        } else if (modal === "catalog.product.picker") {
          const picker = input as CoreModalContractMap["catalog.product.picker"]["input"];
          Object.assign(basePayload, {
            selectionMode: picker.multiple === false ? "single" : "multi",
            initialSelection: picker.selectedProductIds ?? [],
            onConfirm: (_entities: unknown[], productIds: string[]) =>
              settle({ status: "submitted", data: { productIds } } as never),
          });
        } else if (modal === "catalog.variant.picker") {
          const picker = input as CoreModalContractMap["catalog.variant.picker"]["input"];
          Object.assign(basePayload, {
            selectionMode: picker.multiple === false ? "single" : "multi",
            queryMeta: { productId: picker.productId },
            onConfirm: (_entities: unknown[], variantIds: string[]) =>
              settle({ status: "submitted", data: { variantIds } } as never),
          });
        } else {
          const picker = input as CoreModalContractMap["media.file.picker"]["input"];
          Object.assign(basePayload, {
            selectionMode: picker.multiple === false ? "single" : "multi",
            accept: picker.accept?.join(","),
            onConfirm: (files: Array<{ id: string }>) =>
              settle({
                status: "submitted",
                data: { fileIds: files.map((file) => file.id) },
              } as never),
          });
        }

        useModalStackStore.getState().push(CORE_MODAL_TYPES[modal], basePayload, {
          owner,
          onRemoved: (reason) => settle({ status: "cancelled", reason }),
        });
      });
    },
    closeCurrent: <TResult,>(result?: TResult) =>
      resolveAndPop({ status: "submitted", data: result }),
    setCurrentDirty: (dirty: boolean) => {
      const store = useModalStackStore.getState();
      const current = store.peek();
      if (current?.owner === owner) {
        store.setDirty(current.uuid, dirty);
      }
    },
  };
}
