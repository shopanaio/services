import { FilterOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import type { FacetGridRow } from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

export function FacetNameCell(params: ICellRendererParams<FacetGridRow>) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row) {
    return null;
  }

  return (
    <div
      className={styles.nameCell}
      data-testid={
        row.slug ? `facets-table-name-cell-${row.slug}` : undefined
      }
    >
      <FilterOutlined className={styles.facetIcon} />
      <span className={styles.nameText}>
        <Typography.Text ellipsis strong>
          {row.name}
        </Typography.Text>
        {row.slug ? (
          <Typography.Text ellipsis className={styles.secondary}>
            {row.slug}
          </Typography.Text>
        ) : null}
      </span>
    </div>
  );
}
