import { EnvironmentOutlined, FieldTimeOutlined } from "@ant-design/icons";
import { Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { GeneralSettingsStore } from "../types";
import { SettingValue } from "./setting-value";

export const StoreLocation = ({ store }: { store: GeneralSettingsStore }) => (
  <Paper data-testid="location-settings-section">
    <PaperHeader title="Location" />
    <Flex vertical gap={16}>
      <SettingValue
        icon={<EnvironmentOutlined />}
        label="Country/region"
        value={store.country}
      />
      <SettingValue
        icon={<FieldTimeOutlined />}
        label="Timezone"
        value={store.timezone}
      />
    </Flex>
  </Paper>
);
