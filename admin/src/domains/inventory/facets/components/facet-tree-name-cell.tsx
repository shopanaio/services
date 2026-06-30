import {
  DownOutlined,
  FilterOutlined,
  RightOutlined,
  TagsOutlined,
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

  const hasChildren =
    row.type === "facet" &&
    params.allRows.some((candidate) => candidate.parentId === row.id);
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

      {row.type === "facet" ? (
        <FilterOutlined className={styles.facetIcon} />
      ) : (
        <TagsOutlined className={styles.valueIcon} />
      )}

      <span className={styles.nameText}>
        <Typography.Text ellipsis strong={row.type === "facet"}>
          {row.name}
        </Typography.Text>
        {row.slug && (
          <Typography.Text ellipsis className={styles.secondary}>
            {row.slug}
          </Typography.Text>
        )}
      </span>
    </div>
  );
}
