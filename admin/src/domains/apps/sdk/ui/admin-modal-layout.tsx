"use client";

import { ModalHeader, ModalLayout } from "@/layouts/modals";
import { useModalStackContext } from "@/layouts/modals";
import type { AdminAppModalLayoutProps } from "../contracts";

export function AdminAppModalLayout({
  title,
  children,
  actions,
}: AdminAppModalLayoutProps) {
  const { pop } = useModalStackContext();

  return (
    <ModalLayout
      name="admin-app"
      header={
        <ModalHeader
          title={title}
          onClose={pop}
          extra={actions}
          submitButtonProps={null}
        />
      }
    >
      {children}
    </ModalLayout>
  );
}
