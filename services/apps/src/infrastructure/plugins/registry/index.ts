import bankTransfer from "@shopana/payment-plugin-bank-transfer";
import inventoryShopana from "@shopana/inventory-plugin-shopana";
import tildaImport from "@shopana/import-plugin-tilda";
import simplePromo from "@shopana/pricing-plugin-simple-promo";
import meestExpress from "@shopana/shipping-plugin-meest-express";
import novaposhta from "@shopana/shipping-plugin-novaposhta";

type PluginModuleLike = { plugin: unknown };

export const shippingPlugins = [
  novaposhta,
  meestExpress,
] satisfies ReadonlyArray<PluginModuleLike>;

export const paymentPlugins = [
  bankTransfer,
] satisfies ReadonlyArray<PluginModuleLike>;

export const pricingPlugins = [
  simplePromo,
] satisfies ReadonlyArray<PluginModuleLike>;

export const inventoryPlugins = [
  inventoryShopana,
] satisfies ReadonlyArray<PluginModuleLike>;

export const importPlugins = [
  tildaImport,
] satisfies ReadonlyArray<PluginModuleLike>;
