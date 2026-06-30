import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
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
  onLinkSourceValues?: (row: FacetGridRow) => void;
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
  const items: MenuProps["items"] = [
    {
      key: "edit",
      label: "Edit",
      icon: <EditOutlined />,
    },
  ];

  if (row.type === "value") {
    items.push({
      key: "link-source-values",
      label: "Link source values",
      icon: <LinkOutlined />,
    });
  }

  if (row.type === "facet") {
    items.push({
      key: "duplicate",
      label: "Duplicate",
      icon: <CopyOutlined />,
    });
  }

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
            if (key === "link-source-values") {
              params.onLinkSourceValues?.(row);
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
          icon={<MoreOutlined />}
          onClick={(event) => event.stopPropagation()}
          data-testid={`facets-row-actions-${row.id}`}
        />
      </Dropdown>
    </div>
  );
}
