"use client";

import type { ReactNode } from "react";
import { Button, Dropdown, Flex } from "antd";
import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  MenuOutlined,
  SlidersOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { FacetUiType } from "@/graphql/types";

const FACET_UI_TYPE_OPTIONS: {
  key: FacetUiType;
  label: string;
  icon: ReactNode;
}[] = [
  {
    key: FacetUiType.Checkbox,
    label: "Checkbox",
    icon: <CheckSquareOutlined />,
  },
  {
    key: FacetUiType.Radio,
    label: "Radio",
    icon: <CheckCircleOutlined />,
  },
  {
    key: FacetUiType.Dropdown,
    label: "Dropdown",
    icon: <MenuOutlined />,
  },
  {
    key: FacetUiType.Range,
    label: "Range",
    icon: <SlidersOutlined />,
  },
  {
    key: FacetUiType.Boolean,
    label: "Boolean",
    icon: <UnorderedListOutlined />,
  },
];

interface FacetUiTypeSelectorProps {
  value: FacetUiType;
  options: FacetUiType[];
  onChange: (uiType: FacetUiType) => void;
}

export function FacetUiTypeSelector({
  value,
  options,
  onChange,
}: FacetUiTypeSelectorProps) {
  const current = FACET_UI_TYPE_OPTIONS.find((option) => option.key === value);
  const allowedOptions = new Set(options);
  const menuItems = FACET_UI_TYPE_OPTIONS.filter((option) =>
    allowedOptions.has(option.key),
  ).map((option) => ({
    key: option.key,
    label: (
      <Flex gap={8} align="center">
        {option.icon}
        <span>{option.label}</span>
      </Flex>
    ),
    onClick: () => onChange(option.key),
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
      <Button type="text">
        <Flex gap={4} align="center">
          {current?.icon}
          <span>{current?.label}</span>
        </Flex>
      </Button>
    </Dropdown>
  );
}
