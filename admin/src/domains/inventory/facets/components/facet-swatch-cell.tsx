import { Typography } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import { SwatchType } from "@/graphql/types";
import type { FacetGridRow } from "../mappers";
import { useFacetCellStyles } from "./facet-cell-styles";

export function FacetSwatchCell(params: ICellRendererParams<FacetGridRow>) {
  const { styles } = useFacetCellStyles();
  const row = params.data;
  if (!row || row.type !== "value") {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }

  const swatch = row.swatch;
  if (!swatch) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }

  if (swatch.swatchType === SwatchType.Image && swatch.file?.url) {
    return (
      <div className={styles.swatchCell}>
        <img
          className={styles.swatchImage}
          src={swatch.file.url}
          alt={swatch.file.altText ?? swatch.file.originalName ?? row.name}
        />
      </div>
    );
  }

  const background =
    swatch.swatchType === SwatchType.Gradient
      ? `linear-gradient(135deg, ${swatch.colorOne ?? "#fff"}, ${
          swatch.colorTwo ?? swatch.colorOne ?? "#fff"
        })`
      : swatch.colorOne ?? "#fff";

  return (
    <div className={styles.swatchCell}>
      <span className={styles.swatchDot} style={{ background }} />
      <Typography.Text type="secondary">
        {swatch.swatchType === SwatchType.Gradient
          ? "Gradient"
          : swatch.colorOne ?? "Color"}
      </Typography.Text>
    </div>
  );
}
