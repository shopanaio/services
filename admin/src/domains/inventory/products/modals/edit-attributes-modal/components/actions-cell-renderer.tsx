import { Button, Dropdown } from "antd";
import { PlusOutlined, DeleteOutlined, MoreOutlined } from "@ant-design/icons";
import type { ICellRendererParams } from "ag-grid-community";
import { useStyles } from "../edit-attributes-modal.styles";
import type { AttributeEditorRow } from "../types";

export interface IActionsCellRendererParams
  extends ICellRendererParams<AttributeEditorRow> {
  onDelete: (id: string) => void;
  onAdd: (parentId: string) => void;
}

export const ActionsCellRenderer = (params: IActionsCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  const menuItems: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    danger?: boolean;
  }> = [];

  if (data.type === "group") {
    menuItems.push({
      key: "add-attribute",
      label: "Add Attribute",
      icon: <PlusOutlined />,
    });
  }

  menuItems.push({
    key: "delete",
    label: "Delete",
    icon: <DeleteOutlined />,
    danger: true,
  });

  return (
    <div className={styles.actionsCell}>
      <Dropdown
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            if (key === "delete") {
              params.onDelete(data.id);
            } else if (key === "add-attribute") {
              params.onAdd(data.id);
            }
          },
        }}
        trigger={["click"]}
      >
        <Button
          size="small"
          type="text"
          icon={<MoreOutlined />}
          data-testid={`edit-attributes-row-actions-${data.id}`}
        />
      </Dropdown>
    </div>
  );
};
