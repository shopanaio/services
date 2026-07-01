import {
  DownOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Typography } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import type { FacetGridRow } from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

export interface FacetTreeNameCellParams
  extends ICellRendererParams<FacetGridRow> {
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  allRows: FacetGridRow[];
}

export function FacetTreeNameCell(params: FacetTreeNameCellParams) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row) {
    return null;
  }

  const hasChildren = params.allRows.some(
    (candidate) => candidate.parentId === row.id,
  );
  const isExpanded = params.expandedIds.has(row.id);
  const indent = row.level * 24;

  return (
    <div className={styles.nameCell}>
      <span className={styles.indent} style={{ width: indent }} />
      {hasChildren ? (
        <span
          className={styles.expandIcon}
          data-stop-row-click
          onClick={(event) => {
            event.stopPropagation();
            params.onToggleExpand(row.id);
          }}
        >
          {isExpanded ? <DownOutlined /> : <RightOutlined />}
        </span>
      ) : (
        <span className={styles.expandIconPlaceholder} />
      )}

      <span className={styles.nameText}>
        <Typography.Text ellipsis strong>
          {row.name}
        </Typography.Text>
      </span>
    </div>
  );
}
