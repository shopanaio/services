import { Typography } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import { getFacetTypeIcon, type FacetGridRow } from "../mappers";
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
      {row.facetType ? (
        <span className={styles.sourceIcon}>{getFacetTypeIcon(row.facetType)}</span>
      ) : null}
      <span className={styles.nameText}>
        <Typography.Text ellipsis strong>
          {row.name}
        </Typography.Text>
      </span>
    </div>
  );
}
