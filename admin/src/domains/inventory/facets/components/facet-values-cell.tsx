import { Tag, Typography } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import type { FacetGridRow } from "../mappers";
import { isDiscreteFacetType } from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

const MAX_VISIBLE_VALUES = 4;

export interface FacetValuesCellParams extends ICellRendererParams<FacetGridRow> {
  allRows: FacetGridRow[];
  onEditValue: (row: FacetGridRow) => void;
}

export function FacetValuesCell(params: FacetValuesCellParams) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row || row.type !== "facet") {
    return null;
  }

  if (!isDiscreteFacetType(row.facetType)) {
    return <Typography.Text type="secondary">Automatic</Typography.Text>;
  }

  const values = params.allRows
    .filter((candidate) => candidate.parentId === row.id)
    .sort((left, right) => left.sortIndex - right.sortIndex);
  const visibleValues = values.slice(0, MAX_VISIBLE_VALUES);
  const hiddenCount = values.length - visibleValues.length;

  if (values.length === 0) {
    return <Typography.Text type="secondary">No values</Typography.Text>;
  }

  return (
    <div className={styles.valuesCell} data-stop-row-click>
      {visibleValues.map((value) => (
        <Tag
          key={value.id}
          bordered={false}
          className={styles.valueTag}
          onClick={(event) => {
            event.stopPropagation();
            params.onEditValue(value);
          }}
        >
          <Typography.Text
            ellipsis
            className={
              value.enabled === false ? styles.disabledValueText : undefined
            }
          >
            {value.name}
          </Typography.Text>
        </Tag>
      ))}
      {hiddenCount > 0 ? (
        <Typography.Text type="secondary">+{hiddenCount}</Typography.Text>
      ) : null}
    </div>
  );
}
