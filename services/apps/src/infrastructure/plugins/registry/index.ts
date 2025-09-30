// Shipping plugins
import novaposhta from "@shopana/shipping-plugin-novaposhta";
import meestExpress from "@shopana/shipping-plugin-meest-express";

// Payment plugins
import bankTransfer from "@shopana/payment-plugin-bank-transfer";

// Pricing plugins
import simplePromo from "@shopana/pricing-plugin-simple-promo";

export const shippingPlugins = [novaposhta, meestExpress];

export const paymentPlugins = [bankTransfer];

export const pricingPlugins = [simplePromo];
