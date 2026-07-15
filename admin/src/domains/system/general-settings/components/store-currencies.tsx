import { DollarOutlined } from "@ant-design/icons";
import type { CurrencyCode } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SettingValue } from "./setting-value";

const currencyLabels: Partial<Record<CurrencyCode, string>> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  UAH: "UAH (₴)",
};

export const StoreCurrencies = ({
  defaultCurrency,
}: {
  defaultCurrency: CurrencyCode;
}) => (
  <Paper data-testid="currencies-settings-section">
    <PaperHeader title="Currency" />
    <SettingValue
      icon={<DollarOutlined />}
      label="Store currency"
      value={currencyLabels[defaultCurrency] ?? defaultCurrency}
    />
  </Paper>
);
