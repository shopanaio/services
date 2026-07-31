"use client";

import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { Alert, Flex, Input, Typography } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import type { IProductComponentConfigurationModalPayload } from "../../modals";

export const ProductComponentConfigurationModal = () => {
  const { payload, pop, setDirty } = useModalStackContext();
  const modalPayload =
    payload as IProductComponentConfigurationModalPayload;
  const [name, setName] = useState(modalPayload.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedName = useMemo(() => name.trim(), [name]);

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setName(event.target.value);
      setDirty(true);
      setError(null);
    },
    [setDirty],
  );

  const handleSave = useCallback(async () => {
    if (!normalizedName || saving) return;

    setSaving(true);
    setError(null);

    try {
      const shouldClose = await modalPayload.onSave({
        name: normalizedName,
      });

      if (shouldClose !== false) {
        pop();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save configuration",
      );
    } finally {
      setSaving(false);
    }
  }, [modalPayload, normalizedName, pop, saving]);

  return (
    <ModalLayout
      name="product-component-configuration"
      header={
        <ModalHeader
          name="product-component-configuration"
          title={modalPayload.modalTitle}
          onClose={pop}
          submitButtonProps={{
            children: modalPayload.submitLabel ?? "Save",
            disabled: !normalizedName,
            loading: saving,
            onClick: handleSave,
          }}
        />
      }
    >
      <Flex vertical gap={8}>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <Typography.Text strong>Configuration name</Typography.Text>
        <Input
          autoFocus
          value={name}
          placeholder="Configuration name"
          onChange={handleNameChange}
          onPressEnter={() => void handleSave()}
        />
      </Flex>
    </ModalLayout>
  );
};

export default ProductComponentConfigurationModal;
