import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import type { MenuProps } from "antd";
import type { FacetGridRow } from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

export interface FacetTreeActionsCellParams
  extends ICellRendererParams<FacetGridRow> {
  hasUnsavedChanges?: boolean;
  onEdit: (row: FacetGridRow) => void;
  onDuplicate: (row: FacetGridRow) => void;
  onDelete: (row: FacetGridRow) => void;
  onBlockedDelete?: () => void;
}

export function FacetTreeActionsCell(params: FacetTreeActionsCellParams) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row) {
    return null;
  }

  const deleteDisabled = params.hasUnsavedChanges ?? false;
  const rowTestId = row.slug ?? row.id;
  const items: MenuProps["items"] = [
    {
      key: "edit",
      label: "Edit",
      icon: <EditOutlined />,
      "data-testid": `facets-row-action-edit-${rowTestId}`,
    },
  ];

  items.push({
    key: "duplicate",
    label: "Duplicate",
    icon: <CopyOutlined />,
  });

  items.push(
    {
      key: "delete",
      label: deleteDisabled ? "Save or discard changes first" : "Delete",
      icon: <DeleteOutlined />,
      danger: true,
      disabled: deleteDisabled,
    },
  );

  return (
    <div className={styles.actionsCell} data-stop-row-click>
      <Dropdown
        trigger={["click"]}
        menu={{
          items,
          onClick: ({ key }) => {
            if (key === "edit") {
              params.onEdit(row);
            }
            if (key === "duplicate") {
              params.onDuplicate(row);
            }
            if (key === "delete") {
              if (deleteDisabled) {
                params.onBlockedDelete?.();
                return;
              }
              params.onDelete(row);
            }
          },
        }}
      >
        <Button
          size="small"
          type="text"
          className={styles.actionButton}
          icon={<MoreOutlined />}
          onClick={(event) => event.stopPropagation()}
          data-testid={`facets-row-actions-${row.id}`}
        />
      </Dropdown>
    </div>
  );
}
