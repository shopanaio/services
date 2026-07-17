-- Up Migration

CREATE TYPE "pricing"."currency_code" AS ENUM('AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'FOK', 'GBP', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XDR', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL');

CREATE TYPE "pricing"."discount_method" AS ENUM (
  'CODE',
  'AUTOMATIC'
);

CREATE TYPE "pricing"."discount_kind" AS ENUM (
  'AMOUNT_OFF_PRODUCTS',
  'BUY_X_GET_Y',
  'AMOUNT_OFF_ORDER',
  'FREE_SHIPPING'
);

CREATE TYPE "pricing"."discount_class" AS ENUM (
  'PRODUCT',
  'ORDER',
  'SHIPPING'
);

CREATE TYPE "pricing"."discount_state" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED'
);

CREATE TYPE "pricing"."discount_effective_status" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'ARCHIVED'
);

CREATE TYPE "pricing"."discount_code_status" AS ENUM (
  'ACTIVE',
  'DISABLED'
);

CREATE TYPE "pricing"."discount_value_type" AS ENUM (
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'FREE'
);

CREATE TYPE "pricing"."discount_allocation_method" AS ENUM (
  'EACH',
  'ACROSS'
);

CREATE TYPE "pricing"."discount_requirement_type" AS ENUM (
  'SUBTOTAL',
  'QUANTITY'
);

CREATE TYPE "pricing"."discount_target_role" AS ENUM (
  'QUALIFIER',
  'BENEFIT'
);

CREATE TYPE "pricing"."discount_target_type" AS ENUM (
  'ALL_PRODUCTS',
  'PRODUCTS',
  'VARIANTS',
  'COLLECTIONS'
);

CREATE TYPE "pricing"."discount_buyer_context_type" AS ENUM (
  'ALL',
  'CUSTOMERS',
  'SEGMENTS'
);

CREATE TYPE "pricing"."reference_status" AS ENUM (
  'VALID',
  'STALE'
);

CREATE TYPE "pricing"."discount_reservation_status" AS ENUM (
  'ACTIVE',
  'COMMITTED',
  'RELEASED',
  'EXPIRED'
);

CREATE TYPE "pricing"."discount_redemption_status" AS ENUM (
  'COMMITTED',
  'REVERSED'
);

CREATE TYPE "pricing"."discount_allocation_target_type" AS ENUM (
  'ORDER',
  'ORDER_LINE',
  'SHIPPING_LINE'
);

CREATE TYPE "pricing"."external_sync_direction" AS ENUM (
  'IMPORT',
  'EXPORT',
  'BIDIRECTIONAL'
);

CREATE TYPE "pricing"."external_sync_status" AS ENUM (
  'PENDING',
  'SYNCED',
  'FAILED',
  'DISABLED'
);
