"use client";

import { useMemo } from "react";
import { Button, Dropdown, Flex } from "antd";
import { FacetUiType } from "@/graphql/types";
import { getFacetUiTypeOptions } from "../../mappers";

interface FacetUiTypeSelectorProps {
  value: FacetUiType;
  options: FacetUiType[];
  onChange: (uiType: FacetUiType) => void;
  disabled?: boolean;
}

export function FacetUiTypeSelector({
  value,
  options,
  onChange,
  disabled = false,
}: FacetUiTypeSelectorProps) {
  const facetUiTypeOptions = useMemo(
    () => getFacetUiTypeOptions(options),
    [options],
  );
  const current = getFacetUiTypeOptions([value])[0];
  const menuItems = facetUiTypeOptions.map((option) => ({
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
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} disabled={disabled}>
      <Button type="text" disabled={disabled}>
        <Flex gap={4} align="center">
          {current?.icon}
          <span>{current?.label}</span>
        </Flex>
      </Button>
    </Dropdown>
  );
}
