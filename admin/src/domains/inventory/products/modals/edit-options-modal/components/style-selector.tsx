import { Button, Dropdown, Flex } from "antd";
import { type OptionDisplayType } from "@/graphql/types";
import { DISPLAY_TYPE_OPTIONS } from "../edit-options-modal.constants";

interface IDisplayTypeSelectorProps {
  value: OptionDisplayType;
  onChange: (displayType: OptionDisplayType) => void;
}

export const DisplayTypeSelector = ({ value, onChange }: IDisplayTypeSelectorProps) => {
  const current = DISPLAY_TYPE_OPTIONS.find((o) => o.key === value);

  const menuItems = DISPLAY_TYPE_OPTIONS.map((option) => ({
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
      <Button
        size="small"
        type="text"
        data-testid="edit-options-display-type-trigger"
      >
        <Flex gap={4} align="center">
          {current?.icon}
          <span>{current?.label}</span>
        </Flex>
      </Button>
    </Dropdown>
  );
};
