"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, App, Button, Typography, Flex } from "antd";
import { PlusOutlined, HolderOutlined } from "@ant-design/icons";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiGenericUserError } from "@/graphql/types";
import { useSyncProductOptions } from "../../hooks";
import {
  apiProductOptionsToOptionEditorGroups,
  buildProductOptionsSyncDraft,
  formatProductOptionUserErrors,
  validateOptionEditorGroups,
} from "../../mappers";
import type { IEditOptionsModalPayload } from "../../modals";
import { useStyles } from "./edit-options-modal.styles";
import { useEditOptionsForm } from "./hooks/use-edit-options-form";
import { SortableOptionGroup } from "./components/sortable-option-group";

export const EditOptionsModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditOptionsModalPayload;
  const productId = typedPayload.productId ?? "";
  const payloadOptions = typedPayload.options ?? [];
  const onSaved = typedPayload.onSaved;
  const initialGroups = useMemo(
    () => apiProductOptionsToOptionEditorGroups(payloadOptions),
    [payloadOptions],
  );
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [userErrors, setUserErrors] = useState<ApiGenericUserError[]>([]);
  const {
    syncProductOptions,
    loading: saving,
    error: syncError,
  } = useSyncProductOptions();

  const markDirty = useCallback(() => {
    setDirty(true);
    setUserErrors([]);
  }, [setDirty]);

  const {
    fields,
    watchedGroups,
    handleUpdateGroupName,
    handleUpdateGroupDisplayType,
    handleDeleteGroup,
    handleUpdateValueName,
    handleUpdateValueSwatch,
    handleDeleteValue,
    handleAddValue,
    handleReorderValues,
    handleAddGroup,
    handleMoveGroup,
  } = useEditOptionsForm({
    defaultValues: { groups: initialGroups },
    onChange: markDirty,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      if (oldIndex >= 0 && newIndex >= 0) {
        handleMoveGroup(oldIndex, newIndex);
      }
    }
    setActiveGroupId(null);
  };

  const handleSave = useCallback(async () => {
    const validationErrors = validateOptionEditorGroups({
      productId,
      groups: watchedGroups,
    });

    if (validationErrors.length > 0) {
      setUserErrors(validationErrors);
      return;
    }

    const draft = buildProductOptionsSyncDraft({
      productId,
      groups: watchedGroups,
    });
    const result = await syncProductOptions(draft.input);

    if (result.userErrors.length > 0) {
      setUserErrors(result.userErrors);
      return;
    }

    await onSaved?.();
    setDirty(false);
    message.success("Product options updated");
    forcePop();
  }, [
    forcePop,
    message,
    onSaved,
    productId,
    setDirty,
    syncProductOptions,
    watchedGroups,
  ]);

  const activeFieldIndex = fields.findIndex((field) => field.id === activeGroupId);
  const activeGroup =
    activeFieldIndex >= 0 ? watchedGroups[activeFieldIndex] : null;
  const errorMessages =
    userErrors.length > 0
      ? formatProductOptionUserErrors(userErrors)
      : syncError
        ? [syncError.message]
        : [];

  return (
    <ModalLayout
      name="edit-options"
      header={
        <ModalHeader
          name="edit-options"
          title="Edit Product Options"
          onClose={pop}
          submitButtonProps={{
            children: "Save Changes",
            onClick: handleSave,
            loading: saving,
            disabled: saving,
          }}
        />
      }
    >
      <div className={styles.container}>
        {errorMessages.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="Could not save options"
            data-testid="edit-options-error-alert"
            description={
              <Flex vertical gap={4}>
                {errorMessages.map((error, index) => (
                  <Typography.Text key={`${error}-${index}`}>
                    {error}
                  </Typography.Text>
                ))}
              </Flex>
            }
          />
        )}

        <Paper>
          <PaperHeader
            title="Options"
            actions={
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddGroup}
                data-testid="edit-options-add-button"
              >
                Add
              </Button>
            }
          />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <Flex vertical gap={16} data-testid="edit-options-list">
                {fields.map((field, groupIndex) => (
                  <SortableOptionGroup
                    key={field.id}
                    group={watchedGroups[groupIndex]}
                    fieldId={field.id}
                    onUpdateName={(name) =>
                      handleUpdateGroupName(groupIndex, name)
                    }
                    onUpdateDisplayType={(displayType) =>
                      handleUpdateGroupDisplayType(groupIndex, displayType)
                    }
                    onDeleteGroup={() => handleDeleteGroup(groupIndex)}
                    onUpdateValueName={(valueIndex, name) =>
                      handleUpdateValueName(groupIndex, valueIndex, name)
                    }
                    onUpdateValueSwatch={(valueIndex, swatch) =>
                      handleUpdateValueSwatch(groupIndex, valueIndex, swatch)
                    }
                    onDeleteValue={(valueIndex) =>
                      handleDeleteValue(groupIndex, valueIndex)
                    }
                    onAddValue={() => handleAddValue(groupIndex)}
                    onReorderValues={(values) =>
                      handleReorderValues(groupIndex, values)
                    }
                  />
                ))}
              </Flex>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeGroup && (
                <div
                  className={styles.optionGroupHeader}
                  style={{
                    width: 150,
                    boxShadow: "var(--ant-box-shadow-secondary)",
                    cursor: "grabbing",
                  }}
                >
                  <span className={styles.optionGroupDragHandle}>
                    <HolderOutlined />
                  </span>
                  <Typography.Text className={styles.optionGroupName}>
                    {activeGroup.name}
                  </Typography.Text>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </Paper>
      </div>
    </ModalLayout>
  );
};
