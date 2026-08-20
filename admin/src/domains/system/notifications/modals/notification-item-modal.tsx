"use client";

import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import type { NotificationItemModalPayload } from "../modals";

export function NotificationItemModal() {
  const { payload, pop } = useModalStackContext();
  const { title } = payload as NotificationItemModalPayload;

  return (
    <ModalLayout
      name="notification-item"
      headerProps={{
        onClose: pop,
        submitButtonProps: null,
        title,
      }}
    />
  );
}
