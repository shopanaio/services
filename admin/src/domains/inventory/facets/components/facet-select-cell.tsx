import { Select } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import {
  FacetSelectionMode,
  FacetUiType,
} from "@/graphql/types";
import type { FacetGridRow } from "../mappers";
import {
  getAllowedFacetUiTypes,
  getDefaultFacetSelectionMode,
} from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

export interface FacetSelectCellParams
  extends ICellRendererParams<FacetGridRow> {
  onUiTypeChange: (row: FacetGridRow, value: FacetUiType) => void;
  onSelectionModeChange: (
    row: FacetGridRow,
    value: FacetSelectionMode,
  ) => void;
}

export function FacetSelectCell(params: FacetSelectCellParams) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row || row.type !== "facet" || !row.facetType) {
    return null;
  }

  const allowedUiTypes = getAllowedFacetUiTypes(row.facetType);
  const selectionDisabled =
    row.uiType === FacetUiType.Range || row.uiType === FacetUiType.Boolean;

  return (
    <div className={styles.controlsCell} data-stop-row-click>
      <Select
        size="small"
        value={row.uiType}
        options={allowedUiTypes.map((value) => ({ value, label: value }))}
        style={{ minWidth: 112 }}
        onClick={(event) => event.stopPropagation()}
        onChange={(value) => {
          params.onUiTypeChange(row, value);
          if (
            value === FacetUiType.Range ||
            value === FacetUiType.Boolean ||
            row.selectionMode === undefined
          ) {
            params.onSelectionModeChange(
              row,
              getDefaultFacetSelectionMode(value),
            );
          }
        }}
      />
      <Select
        size="small"
        value={row.selectionMode}
        disabled={selectionDisabled}
        options={Object.values(FacetSelectionMode).map((value) => ({
          value,
          label: value,
        }))}
        style={{ minWidth: 96 }}
        onClick={(event) => event.stopPropagation()}
        onChange={(value) => params.onSelectionModeChange(row, value)}
      />
    </div>
  );
}
