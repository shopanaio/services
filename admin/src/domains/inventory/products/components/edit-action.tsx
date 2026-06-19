import { Button, Dropdown } from "antd";
import { MoreOutlined } from "@ant-design/icons";

interface IEditActionProps {
  onEdit: () => void;
  label?: string;
  testId?: string;
}

export const EditAction = ({
  onEdit,
  label = "Edit",
  testId,
}: IEditActionProps) => (
  <Dropdown
    menu={{
      items: [{ key: "edit", label }],
      onClick: () => onEdit(),
    }}
    trigger={["click"]}
  >
    <Button size="small" icon={<MoreOutlined />} data-testid={testId} />
  </Dropdown>
);
