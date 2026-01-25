"use client";

import { useState, useRef } from "react";
import { Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ICellRendererParams } from "ag-grid-community";

// ============================================================================
// Types
// ============================================================================

export interface DropdownOption {
  value: string;
  label: string;
}

export interface IDropdownCellRendererParams<TData = unknown>
  extends ICellRendererParams<TData> {
  /** Available options for the dropdown */
  options: DropdownOption[];
  /** Callback when value changes */
  onChange: (rowId: string, value: string) => void;
  /** Field name to get the current value from data */
  valueField: keyof TData;
  /** Optional function to determine if the dropdown should be shown */
  shouldRender?: (data: TData | undefined) => boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DropdownCellRenderer<TData extends { id: string }>({
  data,
  options,
  onChange,
  valueField,
  shouldRender,
}: IDropdownCellRendererParams<TData>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Check if we should render
  if (shouldRender && !shouldRender(data)) {
    return null;
  }

  if (!data) return null;

  const currentValue = data[valueField] as string | undefined;
  const displayLabel =
    options.find((opt) => opt.value === currentValue)?.label ?? currentValue ?? "—";

  const menuItems: MenuProps["items"] = options.map((opt) => ({
    key: opt.value,
    label: opt.label,
  }));

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    onChange(data.id, key);
    setOpen(false);
  };

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: handleMenuClick }}
      trigger={["contextMenu"]}
      open={open}
      onOpenChange={(visible) => {
        if (!visible) setOpen(false);
      }}
      dropdownRender={(menu) => (
        <div style={{ width: triggerRef.current?.offsetWidth }}>{menu}</div>
      )}
    >
      <div
        ref={triggerRef}
        onDoubleClick={() => setOpen(true)}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 11px",
        }}
      >
        <span>{displayLabel}</span>
        <DownOutlined style={{ fontSize: 10, color: "rgba(0, 0, 0, 0.25)" }} />
      </div>
    </Dropdown>
  );
}

// ============================================================================
// Prebuilt Options
// ============================================================================

export const YES_NO_OPTIONS: DropdownOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
