import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const CREATE_API_KEY_MODAL_TYPE = "system-create-api-key";
export const API_KEY_ACTION_MODAL_TYPE = "system-api-key-action";

interface ApiKeyModalPayload extends IModalStackPayload {
  onSaved?: () => Promise<unknown> | unknown;
}

export type CreateApiKeyModalPayload = ApiKeyModalPayload;

export interface ApiKeyActionModalPayload extends ApiKeyModalPayload {
  action: "revoke" | "delete";
  apiKeyId: string;
  apiKeyName: string;
}

export const useCreateApiKeyModal = createModalStackHook(
  CREATE_API_KEY_MODAL_TYPE,
);
export const useApiKeyActionModal = createModalStackHook(
  API_KEY_ACTION_MODAL_TYPE,
);

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [CREATE_API_KEY_MODAL_TYPE]: CreateApiKeyModalPayload;
    [API_KEY_ACTION_MODAL_TYPE]: ApiKeyActionModalPayload;
  }
}
