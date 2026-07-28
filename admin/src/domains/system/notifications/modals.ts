import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type {
  ApiNotificationTemplateVariable,
  NotificationChannel,
} from "@/graphql/types";

export const NOTIFICATION_ITEM_MODAL_TYPE = "system-notification-item";
export const NOTIFICATION_TEMPLATE_MODAL_TYPE =
  "system-notification-template";

export interface NotificationItemModalPayload extends IModalStackPayload {
  title: string;
}

export interface NotificationTemplateModalPayload extends IModalStackPayload {
  definitionKey: string;
  title: string;
  allowedChannels: NotificationChannel[];
  variables: ApiNotificationTemplateVariable[];
  onSaved?: () => void | Promise<void>;
}

export const useNotificationItemModal = createModalStackHook(
  NOTIFICATION_ITEM_MODAL_TYPE,
);
export const useNotificationTemplateModal = createModalStackHook(
  NOTIFICATION_TEMPLATE_MODAL_TYPE,
);

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [NOTIFICATION_ITEM_MODAL_TYPE]: NotificationItemModalPayload;
    [NOTIFICATION_TEMPLATE_MODAL_TYPE]: NotificationTemplateModalPayload;
  }
}
