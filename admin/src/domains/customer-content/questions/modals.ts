import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const QUESTION_MODAL_TYPE = "customer-question";

export interface QuestionModalPayload extends IModalStackPayload {
  mode: "create" | "edit";
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [QUESTION_MODAL_TYPE]: QuestionModalPayload;
  }
}

export const useQuestionModal = createModalStackHook(QUESTION_MODAL_TYPE);
