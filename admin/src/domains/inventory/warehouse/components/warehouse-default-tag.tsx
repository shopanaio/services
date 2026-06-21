"use client";

import { Tag } from "antd";

interface WarehouseDefaultTagProps {
  isDefault: boolean;
}

export function WarehouseDefaultTag({ isDefault }: WarehouseDefaultTagProps) {
  if (!isDefault) {
    return null;
  }

  return (
    <Tag color="blue" style={{ marginInlineEnd: 0 }}>
      Default
    </Tag>
  );
}
