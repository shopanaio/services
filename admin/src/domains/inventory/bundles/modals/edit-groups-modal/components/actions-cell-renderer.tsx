import { Button, Dropdown } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  MoreOutlined,
  CopyOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { ICellRendererParams } from "ag-grid-community";
import type { MenuProps } from "antd";
import { useStyles } from "../edit-groups-modal.styles";
import type { ITableRow } from "../types";
import { BundleItemType } from "@/graphql/types";

export interface IActionsCellRendererParams
  extends ICellRendererParams<ITableRow> {
  onDelete: (id: string) => void;
  onAddItem: (groupId: string) => void;
  onDuplicateGroup: (groupId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onEditVariants?: (row: ITableRow) => void;
  onIncludeVariants?: (row: ITableRow) => void;
  onShowAsProduct?: (row: ITableRow) => void;
}

export const ActionsCellRenderer = (params: IActionsCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  const {
    onDelete,
    onAddItem,
    onDuplicateGroup,
    onDuplicateItem,
    onEditVariants,
    onIncludeVariants,
    onShowAsProduct,
  } = params;

  // Group actions
  if (data.type === "group") {
    const menuItems: MenuProps["items"] = [
      {
        key: "add-item",
        label: "Add Item",
        icon: <PlusOutlined />,
        onClick: () => onAddItem(data.id),
      },
      {
        key: "duplicate",
        label: "Duplicate Group",
        icon: <CopyOutlined />,
        onClick: () => onDuplicateGroup(data.id),
      },
      { type: "divider" },
      {
        key: "delete",
        label: "Delete Group",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => onDelete(data.id),
      },
    ];

    return (
      <div className={styles.actionsCell}>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>
    );
  }

  // Item actions (product or variant)
  if (data.itemType === BundleItemType.Variant) {
    const menuItems: MenuProps["items"] = [
      ...(onShowAsProduct
        ? [
            {
              key: "show-as-product",
              icon: <CopyOutlined />,
              label: "Show as product",
              onClick: () => onShowAsProduct(data),
            },
          ]
        : []),
      { type: "divider" as const },
      {
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Remove",
        danger: true,
        onClick: () => onDelete(data.id),
      },
    ];

    return (
      <div className={styles.actionsCell}>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </div>
    );
  }

  // Product item
  const menuItems: MenuProps["items"] = [
    {
      key: "duplicate",
      icon: <CopyOutlined />,
      label: "Duplicate",
      onClick: () => onDuplicateItem(data.id),
    },
    ...(onEditVariants
      ? [
          {
            key: "edit-variants",
            icon: <SettingOutlined />,
            label: "Edit variants",
            onClick: () => onEditVariants(data),
          },
        ]
      : []),
    ...(onIncludeVariants
      ? [
          {
            key: "include-variants",
            icon: <PlusOutlined />,
            label: "Show as variants",
            onClick: () => onIncludeVariants(data),
          },
        ]
      : []),
    { type: "divider" as const },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete",
      danger: true,
      onClick: () => onDelete(data.id),
    },
  ];

  return (
    <div className={styles.actionsCell}>
      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
        <Button size="small" type="text" icon={<MoreOutlined />} />
      </Dropdown>
    </div>
  );
};
