-- Up Migration

CREATE TYPE "catalog"."currency_code" AS ENUM('AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'FOK', 'GBP', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XDR', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL');
CREATE TYPE "catalog"."locale_code" AS ENUM('ak', 'sq', 'am', 'ar', 'hy', 'as', 'az', 'bm', 'bn', 'eu', 'be', 'bs', 'br', 'bg', 'my', 'ca', 'ckb', 'ce', 'zh-CN', 'zh-TW', 'kw', 'hr', 'cs', 'da', 'nl', 'dz', 'en', 'eo', 'et', 'ee', 'fo', 'fil', 'fi', 'fr', 'ff', 'gl', 'lg', 'ka', 'de', 'el', 'gu', 'ha', 'he', 'hi', 'hu', 'is', 'ig', 'id', 'ia', 'ga', 'it', 'ja', 'jv', 'kl', 'kn', 'ks', 'kk', 'km', 'ki', 'rw', 'ko', 'ku', 'ky', 'lo', 'lv', 'ln', 'lt', 'lu', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'gv', 'mr', 'mn', 'mi', 'ne', 'nd', 'se', 'no', 'nb', 'nn', 'or', 'om', 'os', 'ps', 'fa', 'pl', 'pt-BR', 'pt-PT', 'pa', 'qu', 'ro', 'rm', 'rn', 'ru', 'sg', 'sa', 'sc', 'gd', 'sr', 'sn', 'ii', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te', 'th', 'bo', 'ti', 'to', 'tr', 'tk', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'fy', 'wo', 'xh', 'yi', 'yo', 'zu');

CREATE TYPE "catalog"."reference_status" AS ENUM (
  'VALID',
  'STALE'
);

CREATE TYPE "catalog"."dimension_unit" AS ENUM (
  'mm',
  'cm',
  'm',
  'in',
  'ft',
  'yd'
);

CREATE TYPE "catalog"."weight_unit" AS ENUM (
  'g',
  'kg',
  'lb',
  'oz'
);

CREATE TYPE "catalog"."stock_movement_type" AS ENUM (
  'SEED',
  'RECEIVE',
  'SELL',
  'RETURN',
  'ADJUST',
  'RESERVE',
  'RELEASE',
  'TRANSFER'
);

CREATE TYPE "catalog"."stock_movement_reason" AS ENUM (
  'DAMAGE',
  'INVENTORY_COUNT',
  'MANUAL',
  'CUSTOMER_RETURN'
);

CREATE TYPE "catalog"."stock_transfer_direction" AS ENUM (
  'IN',
  'OUT'
);

CREATE TYPE "catalog"."stock_apply_status" AS ENUM (
  'APPLIED',
  'REJECTED'
);

CREATE TYPE "catalog"."reservation_status" AS ENUM (
  'ACTIVE',
  'RELEASED',
  'FULFILLED'
);

CREATE TYPE "catalog"."bulk_edit_job_status" AS ENUM (
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "catalog"."bulk_edit_item_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'SUPERSEDED'
);

CREATE TYPE "catalog"."bulk_edit_cancel_reason" AS ENUM (
  'USER',
  'SUPERSEDED',
  'SYSTEM'
);
