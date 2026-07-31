import { Button, Dropdown } from "antd";
import { LuPlus as PlusOutlined, LuTrash2 as DeleteOutlined, LuEllipsis as MoreOutlined, LuCopy as CopyOutlined, LuSettings as SettingOutlined } from "react-icons/lu";
import type { ICellRendererParams } from "ag-grid-community";
import type { MenuProps } from "antd";
import { useStyles } from "../edit-groups-modal.styles";
import type { ITableRow } from "../types";
import { ProductComponentItemType } from "@/graphql/types";

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
        "data-testid": "component-groups-add-item-menu-item",
        onClick: () => onAddItem(data.id),
      },
      {
        key: "duplicate",
        label: "Duplicate Group",
        icon: <CopyOutlined />,
        "data-testid": "component-groups-duplicate-group-menu-item",
        onClick: () => onDuplicateGroup(data.id),
      },
      { type: "divider" },
      {
        key: "delete",
        label: "Delete Group",
        icon: <DeleteOutlined />,
        "data-testid": "component-groups-delete-group-menu-item",
        danger: true,
        onClick: () => onDelete(data.id),
      },
    ];

    return (
      <div className={styles.actionsCell}>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            data-testid="component-groups-row-actions-button"
          />
        </Dropdown>
      </div>
    );
  }

  // Item actions (product or variant)
  if (data.itemType === ProductComponentItemType.Variant) {
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
        "data-testid": "component-groups-remove-variant-menu-item",
        danger: true,
        onClick: () => onDelete(data.id),
      },
    ];

    return (
      <div className={styles.actionsCell}>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <Button
            size="small"
            type="text"
            icon={<MoreOutlined />}
            data-testid="component-groups-row-actions-button"
          />
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
      "data-testid": "component-groups-duplicate-item-menu-item",
      onClick: () => onDuplicateItem(data.id),
    },
    ...(onEditVariants
      ? [
          {
            key: "edit-variants",
            icon: <SettingOutlined />,
            label: "Edit variants",
            "data-testid": "component-groups-edit-variants-menu-item",
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
            "data-testid": "component-groups-show-variants-menu-item",
            onClick: () => onIncludeVariants(data),
          },
        ]
      : []),
    { type: "divider" as const },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete",
      "data-testid": "component-groups-delete-item-menu-item",
      danger: true,
      onClick: () => onDelete(data.id),
    },
  ];

  return (
    <div className={styles.actionsCell}>
      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
        <Button
          size="small"
          type="text"
          icon={<MoreOutlined />}
          data-testid="component-groups-row-actions-button"
        />
      </Dropdown>
    </div>
  );
};
