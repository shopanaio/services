"use client";

import { useMemo, useState } from "react";
import { Input, Typography } from "antd";
import { HolderOutlined } from "@ant-design/icons";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { OptionDisplayType } from "@/graphql/types";
import type {
  OptionEditorSwatch,
  OptionEditorValue,
} from "../../../../products/modals/edit-options-modal/types";
import { useStyles as useOptionValueStyles } from "../../../../products/modals/edit-options-modal/edit-options-modal.styles";
import { SortableValue } from "../../../../products/modals/edit-options-modal/components/sortable-value";

interface FacetValuesListProps {
  values: OptionEditorValue[];
  swatchesEnabled: boolean;
  onReorder: (values: OptionEditorValue[]) => void;
  onUpdateValueName: (valueIndex: number, name: string) => void;
  onUpdateValueSwatch: (
    valueIndex: number,
    swatch: OptionEditorSwatch,
  ) => void;
  onDeleteValue: (valueIndex: number) => void;
}

export function FacetValuesList({
  values,
  swatchesEnabled,
  onReorder,
  onUpdateValueName,
  onUpdateValueSwatch,
  onDeleteValue,
}: FacetValuesListProps) {
  const { styles } = useOptionValueStyles();
  const [activeValueId, setActiveValueId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeValue = useMemo(
    () => values.find((value) => value.id === activeValueId) ?? null,
    [activeValueId, values],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = values.findIndex((value) => value.id === active.id);
      const newIndex = values.findIndex((value) => value.id === over.id);

      if (oldIndex >= 0 && newIndex >= 0) {
        onReorder(arrayMove(values, oldIndex, newIndex));
      }
    }
    setActiveValueId(null);
  };

  if (values.length === 0) {
    return (
      <Typography.Text type="secondary">
        No public values yet.
      </Typography.Text>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveValueId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={values.map((value) => value.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.valuesContainer} data-testid="edit-facet-values-list">
          {values.map((value, valueIndex) => (
            <SortableValue
              key={value.id}
              value={value}
              groupDisplayType={
                swatchesEnabled
                  ? OptionDisplayType.Swatch
                  : OptionDisplayType.Buttons
              }
              isDeleteDisabled={values.length <= 1}
              onNameChange={(name) => onUpdateValueName(valueIndex, name)}
              onSwatchChange={(swatch) =>
                onUpdateValueSwatch(valueIndex, swatch)
              }
              onDelete={() => onDeleteValue(valueIndex)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeValue && (
          <div
            className={styles.valueRow}
            style={{
              width: 180,
              boxShadow: "var(--ant-box-shadow-secondary)",
              cursor: "grabbing",
            }}
          >
            <Input
              value={activeValue.name}
              readOnly
              prefix={
                <span className={styles.valueDragHandle}>
                  <HolderOutlined />
                </span>
              }
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
