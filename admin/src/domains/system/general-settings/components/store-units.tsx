import { LuColumns2 as ColumnWidthOutlined, LuGauge as DashboardOutlined } from "react-icons/lu";
import type { DimensionUnit, WeightUnit } from "@/graphql/types";
import { Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SettingValue } from "./setting-value";

const weightLabels: Record<WeightUnit, string> = {
  g: "Gram (g)",
  kg: "Kilogram (kg)",
  lb: "Pound (lb)",
  oz: "Ounce (oz)",
};

const dimensionLabels: Record<DimensionUnit, string> = {
  cm: "Metric (cm)",
  ft: "Imperial (ft)",
  in: "Imperial (in)",
  m: "Metric (m)",
  mm: "Metric (mm)",
};

export const StoreUnits = ({
  dimensionUnit,
  weightUnit,
}: {
  dimensionUnit: DimensionUnit;
  weightUnit: WeightUnit;
}) => (
  <Paper data-testid="units-settings-section">
    <PaperHeader title="Units" />
    <Flex vertical gap={16}>
      <SettingValue
        icon={<ColumnWidthOutlined />}
        label="Unit system"
        value={dimensionLabels[dimensionUnit]}
      />
      <SettingValue
        icon={<DashboardOutlined />}
        label="Default weight unit"
        value={weightLabels[weightUnit]}
      />
    </Flex>
  </Paper>
);
