"use client";

import { useState } from "react";
import { App, Button, Typography, Flex } from "antd";
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
import { useStyles } from "./edit-options-modal.styles";
import type { ApiProductOption } from "@/graphql/types";
import { useEditOptionsForm } from "./hooks/use-edit-options-form";
import { SortableOptionGroup } from "./components/sortable-option-group";
import { MOCK_OPTION_GROUPS } from "@/mocks/products/options";

interface EditOptionsModalProps {
  initialGroups?: ApiProductOption[];
}

export const EditOptionsModal = ({ initialGroups = MOCK_OPTION_GROUPS }: EditOptionsModalProps) => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { pop } = useModalStackContext();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const {
    fields,
    watchedGroups,
    handleSubmit,
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
    onSubmit: () => {
      message.info("Product option updates are not API-backed yet");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGroupId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      handleMoveGroup(oldIndex, newIndex);
    }
    setActiveGroupId(null);
  };

  const activeFieldIndex = fields.findIndex((f) => f.id === activeGroupId);
  const activeGroup =
    activeFieldIndex >= 0 ? watchedGroups[activeFieldIndex] : null;

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
            onClick: handleSubmit,
          }}
        />
      }
    >
      <div className={styles.container}>
        <Paper>
          <PaperHeader
            title="Options"
            actions={
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddGroup}
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
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <Flex vertical gap={16}>
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
