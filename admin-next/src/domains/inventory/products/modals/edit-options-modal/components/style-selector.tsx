import { Button, Dropdown, Flex } from "antd";
import { STYLE_OPTIONS } from "../edit-options-modal.constants";
import type { FeatureStyleType } from "../edit-options-modal.schema";

interface IStyleSelectorProps {
  value: FeatureStyleType;
  onChange: (style: FeatureStyleType) => void;
}

export const StyleSelector = ({ value, onChange }: IStyleSelectorProps) => {
  const current = STYLE_OPTIONS.find((o) => o.key === value);

  const menuItems = STYLE_OPTIONS.map((option) => ({
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
      <Button size="small" type="text">
        <Flex gap={4} align="center">
          {current?.icon}
          <span>{current?.label}</span>
        </Flex>
      </Button>
    </Dropdown>
  );
};
