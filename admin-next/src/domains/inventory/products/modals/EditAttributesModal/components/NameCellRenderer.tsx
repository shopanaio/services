import {
  FolderOutlined,
  FolderOpenOutlined,
  TagsOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { ICellRendererParams } from "ag-grid-community";
import { useStyles } from "../EditAttributesModal.styles";
import type { IAttributeRow } from "../types";

export interface INameCellRendererParams
  extends ICellRendererParams<IAttributeRow> {
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  allRows: IAttributeRow[];
}

export const NameCellRenderer = (params: INameCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  const { expandedIds, onToggleExpand, allRows } = params;
  // Only groups can have children (attributes)
  const hasChildren =
    data.type === "group" && allRows.some((r) => r.parentId === data.id);
  const isExpanded = expandedIds.has(data.id);

  const getIcon = () => {
    switch (data.type) {
      case "group":
        return isExpanded ? (
          <FolderOpenOutlined className={styles.groupIcon} />
        ) : (
          <FolderOutlined className={styles.groupIcon} />
        );
      case "attribute":
        return <TagsOutlined className={styles.attributeIcon} />;
      default:
        return null;
    }
  };

  const indent = data.level * 24;

  return (
    <div className={styles.nameCell}>
      <span className={styles.indent} style={{ width: indent }} />

      {hasChildren ? (
        <span
          className={styles.expandIcon}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(data.id);
          }}
        >
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </span>
      ) : (
        <span className={styles.expandIconPlaceholder} />
      )}

      {getIcon()}
      <span>{data.name}</span>
    </div>
  );
};
