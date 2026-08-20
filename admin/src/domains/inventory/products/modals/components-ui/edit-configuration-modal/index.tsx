"use client";

import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { Flex, Input, Typography } from "antd";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import type { IComponentEditConfigurationModalPayload } from "@/domains/inventory/products/modals";

export const EditConfigurationModal = () => {
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const modalPayload = payload as IComponentEditConfigurationModalPayload | undefined;

  const [title, setTitle] = useState(modalPayload?.title ?? "");
  const [saving, setSaving] = useState(false);
  const normalizedTitle = useMemo(() => title.trim(), [title]);

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value);
      setDirty(true);
    },
    [setDirty],
  );

  const handleSave = useCallback(async () => {
    if (!normalizedTitle || saving) return;

    setSaving(true);
    try {
      const shouldClose = await modalPayload?.onSave?.({
        title: normalizedTitle,
      });
      if (shouldClose !== false) {
        setDirty(false);
        forcePop();
      }
    } finally {
      setSaving(false);
    }
  }, [forcePop, modalPayload, normalizedTitle, saving, setDirty]);

  return (
    <ModalLayout
      name="edit-component-configuration"
      header={
        <ModalHeader
          name="edit-component-configuration"
          title={modalPayload?.modalTitle ?? "Edit Configuration"}
          onClose={pop}
          submitButtonProps={{
            children: modalPayload?.submitLabel ?? "Save",
            disabled: !normalizedTitle,
            loading: saving,
            onClick: handleSave,
          }}
        />
      }
    >
      <Flex vertical gap={8}>
        <Typography.Text strong>Configuration name</Typography.Text>
        <Input
          autoFocus
          data-testid="component-configuration-name-input"
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
