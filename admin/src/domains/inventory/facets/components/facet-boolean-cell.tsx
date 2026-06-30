import { Switch } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import type { FacetGridRow } from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

export interface FacetBooleanCellParams
  extends ICellRendererParams<FacetGridRow> {
  onEnabledChange: (row: FacetGridRow, value: boolean) => void;
}

export function FacetBooleanCell(params: FacetBooleanCellParams) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row || row.type !== "value") {
    return null;
  }

  return (
    <div className={styles.controlsCell} data-stop-row-click>
      <Switch
        size="small"
        checked={row.enabled ?? false}
        onClick={(_, event) => event.stopPropagation()}
        onChange={(checked) => params.onEnabledChange(row, checked)}
      />
    </div>
  );
}
