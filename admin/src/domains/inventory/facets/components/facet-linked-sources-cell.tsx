import { Button, Tag, Typography } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import type { FacetGridRow } from "../mappers";
import { isDiscreteFacetType } from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

export interface FacetLinkedSourcesCellParams
  extends ICellRendererParams<FacetGridRow> {
  onLinkSourceValues: (row: FacetGridRow) => void;
}

export function FacetLinkedSourcesCell(params: FacetLinkedSourcesCellParams) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row) {
    return null;
  }

  if (row.type === "facet") {
    if (!isDiscreteFacetType(row.facetType)) {
      return <Typography.Text type="secondary">Automatic</Typography.Text>;
    }

    return (
      <Typography.Text type="secondary">
        {row.valuesCount ?? 0} values
      </Typography.Text>
    );
  }

  const handles = row.sourceHandles ?? [];
  const firstHandle = handles[0];

  return (
    <div className={styles.linkedCell} data-stop-row-click>
      {firstHandle ? <Tag>{firstHandle}</Tag> : null}
      <Button
        size="small"
        type="link"
        onClick={(event) => {
          event.stopPropagation();
          params.onLinkSourceValues(row);
        }}
      >
        {handles.length === 0
          ? "Add links"
          : handles.length === 1
            ? "1 linked"
            : `${handles.length} linked`}
      </Button>
    </div>
  );
}
