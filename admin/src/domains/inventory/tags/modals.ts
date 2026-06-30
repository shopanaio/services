import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiTag } from "@/graphql/types";

export const TAG_MODAL_TYPE = "tag";
export const TAG_CREATE_MODAL_TYPE = "tag-create";
export const TAG_EDIT_IDENTITY_MODAL_TYPE = "tag-edit-identity";

export interface ITagModalPayload extends IModalStackPayload {
  entityId?: string;
}

export interface ICreateTagModalPayload extends IModalStackPayload {
  onCreated?: (tag: ApiTag) => void;
}

export interface ITagEditIdentityModalPayload extends IModalStackPayload {
  tag: ApiTag;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [TAG_MODAL_TYPE]: ITagModalPayload;
    [TAG_CREATE_MODAL_TYPE]: ICreateTagModalPayload;
    [TAG_EDIT_IDENTITY_MODAL_TYPE]: ITagEditIdentityModalPayload;
  }
}

export const useTagModal = createModalStackHook(TAG_MODAL_TYPE);
export const useCreateTagModal = createModalStackHook(TAG_CREATE_MODAL_TYPE);
export const useTagEditIdentityModal = createModalStackHook(
  TAG_EDIT_IDENTITY_MODAL_TYPE,
);
