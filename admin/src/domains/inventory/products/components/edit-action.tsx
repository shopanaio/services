import { Button, Dropdown } from "antd";
import { MoreOutlined } from "@ant-design/icons";

interface IEditActionProps {
  onEdit: () => void | Promise<void>;
  label?: string;
  testId?: string;
  loading?: boolean;
  disabled?: boolean;
}

export const EditAction = ({
  onEdit,
  label = "Edit",
  testId,
  loading = false,
  disabled = false,
}: IEditActionProps) => {
  const isDisabled = disabled || loading;

  return (
    <Dropdown
      menu={{
        items: [
          {
            key: "edit",
            label: <span data-testid={testId ? `${testId}-menu-item` : undefined}>{label}</span>,
            disabled: isDisabled,
          },
        ],
        onClick: () => {
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
