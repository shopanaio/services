"use client";

import { Tag } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { IPickableEntity, StatusMap } from "../types";

const DEFAULT_STATUS_MAP: StatusMap = {
  published: { label: "Published", color: "success" },
  draft: { label: "Draft", color: "default" },
  active: { label: "Active", color: "success" },
  inactive: { label: "Inactive", color: "default" },
  archived: { label: "Archived", color: "warning" },
};

interface IStatusCellRendererProps<T extends IPickableEntity>
  extends CustomCellRendererProps<T> {
  statusMap?: StatusMap;
}

export function StatusCellRenderer<T extends IPickableEntity>({
  value,
  statusMap = DEFAULT_STATUS_MAP,
}: IStatusCellRendererProps<T>) {
  if (!value) return null;

  const status = String(value).toLowerCase();
  const config = statusMap[status] ?? { label: String(value), color: "default" };

  return <Tag color={config.color}>{config.label}</Tag>;
}
