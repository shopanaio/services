import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { LuEllipsis as MoreOutlined } from "react-icons/lu";

interface IEditActionProps {
  onEdit: () => void | Promise<void>;
  label?: string;
  testId?: string;
  loading?: boolean;
  disabled?: boolean;
  items?: MenuProps["items"];
}

export const EditAction = ({
  onEdit,
  label = "Edit",
  testId,
  loading = false,
  disabled = false,
  items,
}: IEditActionProps) => {
  const isDisabled = disabled || loading;

  return (
    <Dropdown
      menu={{
        items: items ?? [
          {
            key: "edit",
            label,
            "data-testid": testId ? `${testId}-menu-item` : undefined,
            disabled: isDisabled,
          },
        ],
        onClick: items
          ? undefined
          : () => {
              if (!isDisabled) {
                void onEdit();
              }
            },
      }}
      trigger={["click"]}
    >
      <Button
        size="small"
        icon={<MoreOutlined />}
        data-testid={testId}
        loading={loading}
        disabled={isDisabled}
      />
    </Dropdown>
  );
};
