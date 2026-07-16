import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const QUESTION_MODAL_TYPE = "customer-question";
export const QUESTION_CREATE_MODAL_TYPE = "customer-question-create";
export const QUESTION_EDIT_MODAL_TYPE = "customer-question-edit";

export interface QuestionModalPayload extends IModalStackPayload {
  entityId: string;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface QuestionCreateModalPayload extends IModalStackPayload {
  onSaved?: () => Promise<unknown> | unknown;
}

export type QuestionEditSection = "content" | "moderation" | "answers";

export interface QuestionEditModalPayload extends IModalStackPayload {
  entityId: string;
  section?: QuestionEditSection;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [QUESTION_MODAL_TYPE]: QuestionModalPayload;
    [QUESTION_CREATE_MODAL_TYPE]: QuestionCreateModalPayload;
    [QUESTION_EDIT_MODAL_TYPE]: QuestionEditModalPayload;
  }
}

export const useQuestionModal = createModalStackHook(QUESTION_MODAL_TYPE);
export const useQuestionCreateModal = createModalStackHook(QUESTION_CREATE_MODAL_TYPE);
export const useQuestionEditModal = createModalStackHook(QUESTION_EDIT_MODAL_TYPE);
