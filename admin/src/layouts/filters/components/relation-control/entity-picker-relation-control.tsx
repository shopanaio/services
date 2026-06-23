"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Tooltip, Typography } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useModalStack } from "@/layouts/modals";
import type { IRelationControlProps } from "../../core/types";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";

function toIdArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return typeof value === "string" ? [value] : [];
}

function formatLabel(labels: string[]): string {
  if (labels.length === 0) return "Select...";
  if (labels.length === 1) return labels[0];

  return `${labels[0]} +${labels.length - 1}`;
}

export function EntityPickerRelationControl({
  entity,
  value,
  onChange,
  isMultiple,
  status,
  variant = "borderless",
}: IRelationControlProps) {
  const { push } = useModalStack();
  const selectedIds = useMemo(() => toIdArray(value), [value]);
  const [labelsById, setLabelsById] = useState<Record<string, string>>({});

  const labels = useMemo(
    () => selectedIds.map((id) => labelsById[id] ?? id),
    [labelsById, selectedIds]
  );
  const label = formatLabel(labels);

  const openPicker = useCallback(() => {
    push("entity-picker", {
      entityType: entity,
      selectionMode: isMultiple ? "multi" : "single",
      initialSelection: selectedIds,
      onConfirm: (entities: IPickableEntity[], ids: string[]) => {
        const nextIds = isMultiple ? ids : ids.slice(0, 1);

        setLabelsById((current) => {
          const next = { ...current };
          for (const pickedEntity of entities) {
            next[pickedEntity.id] = pickedEntity.title;
          }
          return next;
        });
        onChange(nextIds);
      },
    });
  }, [entity, isMultiple, onChange, push, selectedIds]);

  return (
    <Tooltip title={labels.length > 1 ? labels.join(", ") : undefined}>
      <Button
        danger={status === "error"}
        type={variant === "borderless" ? "text" : "default"}
        size="small"
        onClick={openPicker}
        style={{
          maxWidth: 180,
          minWidth: selectedIds.length ? 120 : 92,
          paddingInline: 8,
        }}
      >
        <Typography.Text ellipsis style={{ maxWidth: 140 }}>
          {label}
        </Typography.Text>
        <DownOutlined style={{ fontSize: 10 }} />
      </Button>
    </Tooltip>
  );
}
