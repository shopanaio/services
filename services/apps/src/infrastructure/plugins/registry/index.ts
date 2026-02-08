import bankTransfer from "@shopana/payment-plugin-bank-transfer";
import inventoryShopana from "@shopana/inventory-plugin-shopana";
import tildaImport from "@shopana/import-plugin-tilda";
import simplePromo from "@shopana/pricing-plugin-simple-promo";
import meestExpress from "@shopana/shipping-plugin-meest-express";
import novaposhta from "@shopana/shipping-plugin-novaposhta";

type PluginModuleLike = { plugin: unknown };

export const shippingPlugins: ReadonlyArray<PluginModuleLike> = [
  novaposhta,
  meestExpress,
];

export const paymentPlugins: ReadonlyArray<PluginModuleLike> = [
  bankTransfer,
];

export const pricingPlugins: ReadonlyArray<PluginModuleLike> = [
  simplePromo,
];

export const inventoryPlugins: ReadonlyArray<PluginModuleLike> = [
  inventoryShopana,
];

export const importPlugins: ReadonlyArray<PluginModuleLike> = [
  tildaImport,
];
