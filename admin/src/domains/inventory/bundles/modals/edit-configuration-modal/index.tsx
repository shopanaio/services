"use client";

import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { Flex, Input, Typography } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import type { IBundleEditConfigurationModalPayload } from "@/domains/inventory/bundles/modals";

export const EditConfigurationModal = () => {
  const { payload, pop, setDirty } = useModalStackContext();
  const modalPayload = payload as
    | IBundleEditConfigurationModalPayload
    | undefined;

  const [title, setTitle] = useState(modalPayload?.title ?? "");
  const normalizedTitle = useMemo(() => title.trim(), [title]);

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value);
      setDirty(true);
    },
    [setDirty],
  );

  const handleSave = useCallback(() => {
    if (!normalizedTitle) return;

    modalPayload?.onSave?.({ title: normalizedTitle });
    pop();
  }, [modalPayload, normalizedTitle, pop]);

  return (
    <ModalLayout
      name="edit-bundle-configuration"
      header={
        <ModalHeader
          name="edit-bundle-configuration"
          title={modalPayload?.modalTitle ?? "Edit Configuration"}
          onClose={pop}
          submitButtonProps={{
            children: modalPayload?.submitLabel ?? "Save",
            disabled: !normalizedTitle,
            onClick: handleSave,
          }}
        />
      }
    >
      <Flex vertical gap={8}>
        <Typography.Text strong>Configuration name</Typography.Text>
        <Input
          autoFocus
          value={title}
          placeholder="Configuration name"
          onChange={handleTitleChange}
          onPressEnter={handleSave}
        />
      </Flex>
    </ModalLayout>
  );
};

export default EditConfigurationModal;
