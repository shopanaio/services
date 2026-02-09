import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/** Filter operators for Boolean fields */
export type BooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Currency codes according to ISO 4217 */
export enum CurrencyCode {
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  Aed = 'AED',
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  Afn = 'AFN',
  /** Albanian Lek (Albania) - 0 decimals */
  All = 'ALL',
  /** Armenian Dram (Armenia) - 2 decimals */
  Amd = 'AMD',
  /** Netherlands Antillean Guilder - 2 decimals */
  Ang = 'ANG',
  /** Angolan Kwanza (Angola) - 2 decimals */
  Aoa = 'AOA',
  /** Argentine Peso (Argentina) - 2 decimals */
  Ars = 'ARS',
  /** Australian Dollar (Australia) - 2 decimals */
  Aud = 'AUD',
  /** Aruban Florin (Aruba) - 2 decimals */
  Awg = 'AWG',
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  Azn = 'AZN',
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  Bam = 'BAM',
  /** Barbadian Dollar (Barbados) - 2 decimals */
  Bbd = 'BBD',
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  Bdt = 'BDT',
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  Bgn = 'BGN',
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  Bhd = 'BHD',
  /** Burundian Franc (Burundi) - 0 decimals */
  Bif = 'BIF',
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  Bmd = 'BMD',
  /** Brunei Dollar (Brunei) - 2 decimals */
  Bnd = 'BND',
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  Bob = 'BOB',
  /** Brazilian Real (Brazil) - 2 decimals */
  Brl = 'BRL',
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  Bsd = 'BSD',
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  Btn = 'BTN',
  /** Botswana Pula (Botswana) - 2 decimals */
  Bwp = 'BWP',
  /** Belarusian Ruble (Belarus) - 2 decimals */
  Byn = 'BYN',
  /** Belize Dollar (Belize) - 2 decimals */
  Bzd = 'BZD',
  /** Canadian Dollar (Canada) - 2 decimals */
  Cad = 'CAD',
  /** Congolese Franc (DR Congo) - 2 decimals */
  Cdf = 'CDF',
  /** Swiss Franc (Switzerland) - 2 decimals */
  Chf = 'CHF',
  /** Chilean Peso (Chile) - 0 decimals */
  Clp = 'CLP',
  /** Chinese Yuan (China) - 2 decimals */
  Cny = 'CNY',
  /** Colombian Peso (Colombia) - 2 decimals */
  Cop = 'COP',
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  Crc = 'CRC',
  /** Cuban Peso (Cuba) - 2 decimals */
  Cup = 'CUP',
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  Cve = 'CVE',
  /** Czech Koruna (Czech Republic) - 2 decimals */
  Czk = 'CZK',
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  Djf = 'DJF',
  /** Danish Krone (Denmark) - 2 decimals */
  Dkk = 'DKK',
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  Dop = 'DOP',
  /** Algerian Dinar (Algeria) - 2 decimals */
  Dzd = 'DZD',
  /** Egyptian Pound (Egypt) - 2 decimals */
  Egp = 'EGP',
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  Ern = 'ERN',
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  Etb = 'ETB',
  /** Euro (European Union) - 2 decimals */
  Eur = 'EUR',
  /** Fijian Dollar (Fiji) - 2 decimals */
  Fjd = 'FJD',
  /** Falkland Islands Pound - 2 decimals */
  Fkp = 'FKP',
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  Fok = 'FOK',
  /** Pound Sterling (United Kingdom) - 2 decimals */
  Gbp = 'GBP',
  /** Georgian Lari (Georgia) - 2 decimals */
  Gel = 'GEL',
  /** Guernsey Pound (Guernsey) - 2 decimals */
  Ggp = 'GGP',
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  Ghs = 'GHS',
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  Gip = 'GIP',
  /** Gambian Dalasi (Gambia) - 2 decimals */
  Gmd = 'GMD',
  /** Guinean Franc (Guinea) - 0 decimals */
  Gnf = 'GNF',
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  Gtq = 'GTQ',
  /** Guyanese Dollar (Guyana) - 2 decimals */
  Gyd = 'GYD',
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  Hkd = 'HKD',
  /** Honduran Lempira (Honduras) - 2 decimals */
  Hnl = 'HNL',
  /** Croatian Kuna (Croatia) - 2 decimals */
  Hrk = 'HRK',
  /** Haitian Gourde (Haiti) - 2 decimals */
  Htg = 'HTG',
  /** Hungarian Forint (Hungary) - 2 decimals */
  Huf = 'HUF',
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  Idr = 'IDR',
  /** Israeli New Shekel (Israel) - 2 decimals */
  Ils = 'ILS',
  /** Isle of Man Pound - 2 decimals */
  Imp = 'IMP',
  /** Indian Rupee (India) - 2 decimals */
  Inr = 'INR',
  /** Iraqi Dinar (Iraq) - 3 decimals */
  Iqd = 'IQD',
  /** Iranian Rial (Iran) - 2 decimals */
  Irr = 'IRR',
  /** Icelandic Króna (Iceland) - 0 decimals */
  Isk = 'ISK',
  /** Jersey Pound (Jersey) - 2 decimals */
  Jep = 'JEP',
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  Jmd = 'JMD',
  /** Jordanian Dinar (Jordan) - 3 decimals */
  Jod = 'JOD',
  /** Japanese Yen (Japan) - 0 decimals */
  Jpy = 'JPY',
  /** Kenyan Shilling (Kenya) - 2 decimals */
  Kes = 'KES',
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  Kgs = 'KGS',
  /** Cambodian Riel (Cambodia) - 2 decimals */
  Khr = 'KHR',
  /** Comorian Franc (Comoros) - 2 decimals */
  Kmf = 'KMF',
  /** North Korean Won (North Korea) - 2 decimals */
  Kpw = 'KPW',
  /** South Korean Won (South Korea) - 0 decimals */
  Krw = 'KRW',
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  Kwd = 'KWD',
  /** Cayman Islands Dollar - 2 decimals */
  Kyd = 'KYD',
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  Kzt = 'KZT',
  /** Lao Kip (Laos) - 2 decimals */
  Lak = 'LAK',
  /** Lebanese Pound (Lebanon) - 2 decimals */
  Lbp = 'LBP',
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  Lkr = 'LKR',
  /** Liberian Dollar (Liberia) - 2 decimals */
  Lrd = 'LRD',
  /** Lesotho Loti (Lesotho) - 2 decimals */
  Lsl = 'LSL',
  /** Libyan Dinar (Libya) - 3 decimals */
  Lyd = 'LYD',
  /** Moroccan Dirham (Morocco) - 2 decimals */
  Mad = 'MAD',
  /** Moldovan Leu (Moldova) - 2 decimals */
  Mdl = 'MDL',
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  Mga = 'MGA',
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  Mkd = 'MKD',
  /** Burmese Kyat (Myanmar) - 2 decimals */
  Mmk = 'MMK',
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  Mnt = 'MNT',
  /** Macanese Pataca (Macau) - 2 decimals */
  Mop = 'MOP',
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  Mru = 'MRU',
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  Mur = 'MUR',
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  Mvr = 'MVR',
  /** Malawian Kwacha (Malawi) - 2 decimals */
  Mwk = 'MWK',
  /** Mexican Peso (Mexico) - 2 decimals */
  Mxn = 'MXN',
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  Myr = 'MYR',
  /** Mozambican Metical (Mozambique) - 2 decimals */
  Mzn = 'MZN',
  /** Namibian Dollar (Namibia) - 2 decimals */
  Nad = 'NAD',
  /** Nigerian Naira (Nigeria) - 2 decimals */
  Ngn = 'NGN',
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  Nio = 'NIO',
  /** Norwegian Krone (Norway) - 2 decimals */
  Nok = 'NOK',
  /** Nepalese Rupee (Nepal) - 2 decimals */
  Npr = 'NPR',
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  Nzd = 'NZD',
  /** Omani Rial (Oman) - 3 decimals */
  Omr = 'OMR',
  /** Panamanian Balboa (Panama) - 2 decimals */
  Pab = 'PAB',
  /** Peruvian Sol (Peru) - 2 decimals */
  Pen = 'PEN',
  /** Papua New Guinean Kina - 2 decimals */
  Pgk = 'PGK',
  /** Philippine Peso (Philippines) - 2 decimals */
  Php = 'PHP',
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  Pkr = 'PKR',
  /** Polish Zloty (Poland) - 2 decimals */
  Pln = 'PLN',
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  Pyg = 'PYG',
  /** Qatari Riyal (Qatar) - 2 decimals */
  Qar = 'QAR',
  /** Romanian Leu (Romania) - 2 decimals */
  Ron = 'RON',
  /** Serbian Dinar (Serbia) - 2 decimals */
  Rsd = 'RSD',
  /** Russian Ruble (Russia) - 2 decimals */
  Rub = 'RUB',
  /** Rwandan Franc (Rwanda) - 0 decimals */
  Rwf = 'RWF',
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  Sar = 'SAR',
  /** Solomon Islands Dollar - 2 decimals */
  Sbd = 'SBD',
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  Scr = 'SCR',
  /** Sudanese Pound (Sudan) - 2 decimals */
  Sdg = 'SDG',
  /** Swedish Krona (Sweden) - 2 decimals */
  Sek = 'SEK',
  /** Singapore Dollar (Singapore) - 2 decimals */
  Sgd = 'SGD',
  /** Saint Helena Pound - 2 decimals */
  Shp = 'SHP',
  /** Sierra Leonean Leone - 2 decimals */
  Sle = 'SLE',
  /** Somali Shilling (Somalia) - 2 decimals */
  Sos = 'SOS',
  /** Surinamese Dollar (Suriname) - 2 decimals */
  Srd = 'SRD',
  /** South Sudanese Pound - 2 decimals */
  Ssp = 'SSP',
  /** São Tomé and Príncipe Dobra - 2 decimals */
  Stn = 'STN',
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  Svc = 'SVC',
  /** Syrian Pound (Syria) - 2 decimals */
  Syp = 'SYP',
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  Szl = 'SZL',
  /** Thai Baht (Thailand) - 2 decimals */
  Thb = 'THB',
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  Tjs = 'TJS',
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  Tmt = 'TMT',
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  Tnd = 'TND',
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  Top = 'TOP',
  /** Turkish Lira (Turkey) - 2 decimals */
  Try = 'TRY',
  /** Trinidad and Tobago Dollar - 2 decimals */
  Ttd = 'TTD',
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  Twd = 'TWD',
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  Tzs = 'TZS',
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  Uah = 'UAH',
  /** Ugandan Shilling (Uganda) - 0 decimals */
  Ugx = 'UGX',
  /** United States Dollar (USA) - 2 decimals */
  Usd = 'USD',
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  Uyu = 'UYU',
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  Uzs = 'UZS',
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  Ves = 'VES',
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  Vnd = 'VND',
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  Vuv = 'VUV',
  /** Samoan Tala (Samoa) - 2 decimals */
  Wst = 'WST',
  /** Central African CFA Franc - 0 decimals */
  Xaf = 'XAF',
  /** East Caribbean Dollar - 2 decimals */
  Xcd = 'XCD',
  /** Special Drawing Rights (IMF) - 0 decimals */
  Xdr = 'XDR',
  /** West African CFA Franc - 0 decimals */
  Xof = 'XOF',
  /** CFP Franc - 0 decimals */
  Xpf = 'XPF',
  /** Yemeni Rial (Yemen) - 2 decimals */
  Yer = 'YER',
  /** South African Rand (South Africa) - 2 decimals */
  Zar = 'ZAR',
  /** Zambian Kwacha (Zambia) - 2 decimals */
  Zmw = 'ZMW',
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  Zwl = 'ZWL'
}

/** Filter operators for DateTime fields */
export type DateTimeFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than (before) */
  _lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Less than or equal (on or before) */
  _lte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['DateTime']['input']>>;
};

/** Dimension (length) measurement units */
export enum DimensionUnit {
  /** Centimeter */
  Cm = 'cm',
  /** Foot */
  Ft = 'ft',
  /** Inch */
  In = 'in',
  /** Meter */
  M = 'm',
  /** Millimeter */
  Mm = 'mm'
}

/** Input for setting dimensions (in millimeters). */
export type DimensionsInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
};

/** Filter operators for Float fields */
export type FloatFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Float']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Float']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Float']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Float']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields */
export type IdFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['ID']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['ID']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Filter operators for Int fields */
export type IntFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Int']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Int']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Int']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Int']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type InventoryAlertThreshold = {
  __typename?: 'InventoryAlertThreshold';
  method: ThresholdMethod;
  minimumStock: Scalars['Int']['output'];
};

export type InventoryBackorder = {
  __typename?: 'InventoryBackorder';
  etaAvgDays: Maybe<Scalars['Float']['output']>;
  quantity: Scalars['Int']['output'];
};

/**
 * InventoryItem represents the inventory-specific data for a variant.
 * Each Variant in Catalog has a corresponding InventoryItem in Inventory service.
 */
export type InventoryItem = Node & {
  __typename?: 'InventoryItem';
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock: Scalars['Boolean']['output'];
  /** When this item was created */
  createdAt: Scalars['DateTime']['output'];
  /** Physical dimensions (mm) */
  dimensions: Maybe<InventoryItemDimensions>;
  /** Global ID (Relay) */
  id: Scalars['ID']['output'];
  /** SKU code */
  sku: Maybe<Scalars['String']['output']>;
  /** Stock levels across warehouses */
  stock: Array<WarehouseStock>;
  /** Total quantity available across all warehouses */
  totalAvailable: Scalars['Int']['output'];
  /** Whether to track inventory for this item */
  trackInventory: Scalars['Boolean']['output'];
  /** Current unit cost */
  unitCost: Maybe<InventoryItemCost>;
  /** When this item was last updated */
  updatedAt: Scalars['DateTime']['output'];
  /** Reference to Catalog.Variant */
  variantId: Scalars['ID']['output'];
  /** Weight (grams) */
  weight: Maybe<InventoryItemWeight>;
};

export type InventoryItemConnection = {
  __typename?: 'InventoryItemConnection';
  edges: Array<InventoryItemEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type InventoryItemCost = {
  __typename?: 'InventoryItemCost';
  /** Cost in minor units (cents) */
  amountMinor: Scalars['BigInt']['output'];
  /** Currency code */
  currency: Scalars['String']['output'];
  /** Effective from date */
  effectiveFrom: Scalars['DateTime']['output'];
};

export type InventoryItemCostInput = {
  amountMinor: Scalars['BigInt']['input'];
  currency: Scalars['String']['input'];
};

export type InventoryItemDimensions = {
  __typename?: 'InventoryItemDimensions';
  /** Display unit preference */
  displayUnit: DimensionUnit;
  /** Height in millimeters */
  heightMm: Scalars['Int']['output'];
  /** Length in millimeters */
  lengthMm: Scalars['Int']['output'];
  /** Width in millimeters */
  widthMm: Scalars['Int']['output'];
};

export type InventoryItemDimensionsInput = {
  heightMm: Scalars['Int']['input'];
  lengthMm: Scalars['Int']['input'];
  widthMm: Scalars['Int']['input'];
};

export type InventoryItemEdge = {
  __typename?: 'InventoryItemEdge';
  cursor: Scalars['String']['output'];
  node: InventoryItem;
};

export type InventoryItemStockInput = {
  onHand: Scalars['Int']['input'];
  unavailable?: InputMaybe<Scalars['Int']['input']>;
  warehouseId: Scalars['ID']['input'];
};

export type InventoryItemUpdateInput = {
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** Physical dimensions update */
  dimensions?: InputMaybe<InventoryItemDimensionsInput>;
  /** The inventory item ID to update */
  id: Scalars['ID']['input'];
  /** New SKU value */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Stock update for a specific warehouse */
  stock?: InputMaybe<InventoryItemStockInput>;
  /** Whether to track inventory */
  trackInventory?: InputMaybe<Scalars['Boolean']['input']>;
  /** Unit cost update */
  unitCost?: InputMaybe<InventoryItemCostInput>;
  /** Weight update */
  weight?: InputMaybe<InventoryItemWeightInput>;
};

export type InventoryItemUpdatePayload = {
  __typename?: 'InventoryItemUpdatePayload';
  /** Updated inventory item */
  inventoryItem: Maybe<InventoryItem>;
  /** List of errors */
  userErrors: Array<GenericUserError>;
};

export type InventoryItemWeight = {
  __typename?: 'InventoryItemWeight';
  /** Display unit preference */
  displayUnit: WeightUnit;
  /** Weight in grams */
  weightGrams: Scalars['Int']['output'];
};

export type InventoryItemWeightInput = {
  weightGrams: Scalars['Int']['input'];
};

export type InventoryItemWhereInput = {
  /** Filter by SKU */
  sku?: InputMaybe<StringFilter>;
  /** Filter by trackInventory */
  trackInventory?: InputMaybe<Scalars['Boolean']['input']>;
};

export type InventoryMutation = {
  __typename?: 'InventoryMutation';
  /**
   * Update inventory item: stock, SKU, weight, cost, dimensions.
   * Replaces variantUpdateInventory and variantUpdateDimensions.
   */
  inventoryItemUpdate: InventoryItemUpdatePayload;
  warehouseCreate: WarehouseCreatePayload;
  warehouseDelete: WarehouseDeletePayload;
  warehouseUpdate: WarehouseUpdatePayload;
};


export type InventoryMutationInventoryItemUpdateArgs = {
  input: InventoryItemUpdateInput;
};


export type InventoryMutationWarehouseCreateArgs = {
  input: WarehouseCreateInput;
};


export type InventoryMutationWarehouseDeleteArgs = {
  input: WarehouseDeleteInput;
};


export type InventoryMutationWarehouseUpdateArgs = {
  input: WarehouseUpdateInput;
};

export type InventoryQuantities = {
  __typename?: 'InventoryQuantities';
  availableForSale: Scalars['Int']['output'];
  onHand: Scalars['Int']['output'];
  reserved: Scalars['Int']['output'];
  unavailable: Scalars['Int']['output'];
};

export type InventoryQuery = {
  __typename?: 'InventoryQuery';
  /** Get an inventory item by ID */
  inventoryItem: Maybe<InventoryItem>;
  /** Get an inventory item by variant ID */
  inventoryItemByVariant: Maybe<InventoryItem>;
  /** Get inventory items with Relay-style pagination */
  inventoryItems: InventoryItemConnection;
  /** Get a node by its global ID */
  node: Maybe<Node>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<Node>>;
  /** Get a warehouse by ID */
  warehouse: Maybe<Warehouse>;
  /** Get all warehouses */
  warehouses: WarehouseConnection;
};


export type InventoryQueryInventoryItemArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryInventoryItemByVariantArgs = {
  variantId: Scalars['ID']['input'];
};


export type InventoryQueryInventoryItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<InventoryItemWhereInput>;
};


export type InventoryQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type InventoryQueryWarehouseArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryWarehousesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<WarehouseOrderByInput>>;
  where?: InputMaybe<WarehouseWhereInput>;
};

export type InventorySkuStatus = {
  __typename?: 'InventorySkuStatus';
  backorder: SkuStatusMetric;
  lowStock: SkuStatusMetric;
  outOfStock: SkuStatusMetric;
  total: Scalars['Int']['output'];
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum LocaleCode {
  /** Akan */
  Ak = 'ak',
  /** Amharic */
  Am = 'am',
  /** Arabic */
  Ar = 'ar',
  /** Assamese */
  As = 'as',
  /** Azerbaijani */
  Az = 'az',
  /** Belarusian */
  Be = 'be',
  /** Bulgarian */
  Bg = 'bg',
  /** Bambara */
  Bm = 'bm',
  /** Bangla */
  Bn = 'bn',
  /** Tibetan */
  Bo = 'bo',
  /** Breton */
  Br = 'br',
  /** Bosnian */
  Bs = 'bs',
  /** Catalan */
  Ca = 'ca',
  /** Chechen */
  Ce = 'ce',
  /** Central Kurdish */
  Ckb = 'ckb',
  /** Czech */
  Cs = 'cs',
  /** Welsh */
  Cy = 'cy',
  /** Danish */
  Da = 'da',
  /** German */
  De = 'de',
  /** Dzongkha */
  Dz = 'dz',
  /** Ewe */
  Ee = 'ee',
  /** Greek */
  El = 'el',
  /** English */
  En = 'en',
  /** Esperanto */
  Eo = 'eo',
  /** Spanish */
  Es = 'es',
  /** Estonian */
  Et = 'et',
  /** Basque */
  Eu = 'eu',
  /** Persian */
  Fa = 'fa',
  /** Fulah */
  Ff = 'ff',
  /** Finnish */
  Fi = 'fi',
  /** Filipino */
  Fil = 'fil',
  /** Faroese */
  Fo = 'fo',
  /** French */
  Fr = 'fr',
  /** Western Frisian */
  Fy = 'fy',
  /** Irish */
  Ga = 'ga',
  /** Scottish Gaelic */
  Gd = 'gd',
  /** Galician */
  Gl = 'gl',
  /** Gujarati */
  Gu = 'gu',
  /** Manx */
  Gv = 'gv',
  /** Hausa */
  Ha = 'ha',
  /** Hebrew */
  He = 'he',
  /** Hindi */
  Hi = 'hi',
  /** Croatian */
  Hr = 'hr',
  /** Hungarian */
  Hu = 'hu',
  /** Armenian */
  Hy = 'hy',
  /** Interlingua */
  Ia = 'ia',
  /** Indonesian */
  Id = 'id',
  /** Igbo */
  Ig = 'ig',
  /** Sichuan Yi */
  Ii = 'ii',
  /** Icelandic */
  Is = 'is',
  /** Italian */
  It = 'it',
  /** Japanese */
  Ja = 'ja',
  /** Javanese */
  Jv = 'jv',
  /** Georgian */
  Ka = 'ka',
  /** Kikuyu */
  Ki = 'ki',
  /** Kazakh */
  Kk = 'kk',
  /** Kalaallisut */
  Kl = 'kl',
  /** Khmer */
  Km = 'km',
  /** Kannada */
  Kn = 'kn',
  /** Korean */
  Ko = 'ko',
  /** Kashmiri */
  Ks = 'ks',
  /** Kurdish */
  Ku = 'ku',
  /** Cornish */
  Kw = 'kw',
  /** Kyrgyz */
  Ky = 'ky',
  /** Luxembourgish */
  Lb = 'lb',
  /** Ganda */
  Lg = 'lg',
  /** Lingala */
  Ln = 'ln',
  /** Lao */
  Lo = 'lo',
  /** Lithuanian */
  Lt = 'lt',
  /** Luba-Katanga */
  Lu = 'lu',
  /** Latvian */
  Lv = 'lv',
  /** Malagasy */
  Mg = 'mg',
  /** Māori */
  Mi = 'mi',
  /** Macedonian */
  Mk = 'mk',
  /** Malayalam */
  Ml = 'ml',
  /** Mongolian */
  Mn = 'mn',
  /** Marathi */
  Mr = 'mr',
  /** Malay */
  Ms = 'ms',
  /** Maltese */
  Mt = 'mt',
  /** Burmese */
  My = 'my',
  /** Norwegian Bokmål */
  Nb = 'nb',
  /** North Ndebele */
  Nd = 'nd',
  /** Nepali */
  Ne = 'ne',
  /** Dutch */
  Nl = 'nl',
  /** Norwegian Nynorsk */
  Nn = 'nn',
  /** Norwegian */
  No = 'no',
  /** Oromo */
  Om = 'om',
  /** Odia */
  Or = 'or',
  /** Ossetic */
  Os = 'os',
  /** Punjabi */
  Pa = 'pa',
  /** Polish */
  Pl = 'pl',
  /** Pashto */
  Ps = 'ps',
  /** Portuguese (Brazil) */
  PtBr = 'pt_BR',
  /** Portuguese (Portugal) */
  PtPt = 'pt_PT',
  /** Quechua */
  Qu = 'qu',
  /** Romansh */
  Rm = 'rm',
  /** Rundi */
  Rn = 'rn',
  /** Romanian */
  Ro = 'ro',
  /** Russian */
  Ru = 'ru',
  /** Kinyarwanda */
  Rw = 'rw',
  /** Sanskrit */
  Sa = 'sa',
  /** Sardinian */
  Sc = 'sc',
  /** Sindhi */
  Sd = 'sd',
  /** Northern Sami */
  Se = 'se',
  /** Sango */
  Sg = 'sg',
  /** Sinhala */
  Si = 'si',
  /** Slovak */
  Sk = 'sk',
  /** Slovenian */
  Sl = 'sl',
  /** Shona */
  Sn = 'sn',
  /** Somali */
  So = 'so',
  /** Albanian */
  Sq = 'sq',
  /** Serbian */
  Sr = 'sr',
  /** Sundanese */
  Su = 'su',
  /** Swedish */
  Sv = 'sv',
  /** Swahili */
  Sw = 'sw',
  /** Tamil */
  Ta = 'ta',
  /** Telugu */
  Te = 'te',
  /** Tajik */
  Tg = 'tg',
  /** Thai */
  Th = 'th',
  /** Tigrinya */
  Ti = 'ti',
  /** Turkmen */
  Tk = 'tk',
  /** Tongan */
  To = 'to',
  /** Turkish */
  Tr = 'tr',
  /** Tatar */
  Tt = 'tt',
  /** Uyghur */
  Ug = 'ug',
  /** Ukrainian */
  Uk = 'uk',
  /** Urdu */
  Ur = 'ur',
  /** Uzbek */
  Uz = 'uz',
  /** Vietnamese */
  Vi = 'vi',
  /** Wolof */
  Wo = 'wo',
  /** Xhosa */
  Xh = 'xh',
  /** Yiddish */
  Yi = 'yi',
  /** Yoruba */
  Yo = 'yo',
  /** Chinese (Simplified) */
  ZhCn = 'zh_CN',
  /** Chinese (Traditional) */
  ZhTw = 'zh_TW',
  /** Zulu */
  Zu = 'zu'
}

export type Mutation = {
  __typename?: 'Mutation';
  inventoryMutation: InventoryMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor: Maybe<Scalars['String']['output']>;
};

export type ProductInventoryWidget = {
  __typename?: 'ProductInventoryWidget';
  alertThreshold: InventoryAlertThreshold;
  availableChange7d: Scalars['Int']['output'];
  backorder: InventoryBackorder;
  quantities: InventoryQuantities;
  skuStatus: InventorySkuStatus;
};

export type Query = {
  __typename?: 'Query';
  inventoryQuery: InventoryQuery;
  widgetQuery: WidgetQuery;
};

export type SkuStatusMetric = {
  __typename?: 'SkuStatusMetric';
  averageDays: Maybe<Scalars['Float']['output']>;
  count: Scalars['Int']['output'];
};

/** Sort direction */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** Filter operators for String fields */
export type StringFilter = {
  /** Contains substring (case-sensitive) */
  _contains?: InputMaybe<Scalars['String']['input']>;
  /** Contains substring (case-insensitive) */
  _containsi?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-sensitive) */
  _endsWith?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-insensitive) */
  _endsWithi?: InputMaybe<Scalars['String']['input']>;
  /** Equals */
  _eq?: InputMaybe<Scalars['String']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-sensitive) */
  _notContains?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-insensitive) */
  _notContainsi?: InputMaybe<Scalars['String']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Starts with (case-sensitive) */
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with (case-insensitive) */
  _startsWithi?: InputMaybe<Scalars['String']['input']>;
};

export enum ThresholdMethod {
  ReorderPoint = 'REORDER_POINT',
  SafetyStock = 'SAFETY_STOCK'
}

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

export type Variant = {
  __typename?: 'Variant';
  id: Scalars['ID']['output'];
  /** Inventory item associated with this variant */
  inventoryItem: Maybe<InventoryItem>;
};

/** Physical dimensions of a variant (stored in millimeters). */
export type VariantDimensions = {
  __typename?: 'VariantDimensions';
  /** Height in millimeters. */
  height: Scalars['Int']['output'];
  /** Length in millimeters. */
  length: Scalars['Int']['output'];
  /** Width in millimeters. */
  width: Scalars['Int']['output'];
};

/** Physical weight of a variant (stored in grams). */
export type VariantWeight = {
  __typename?: 'VariantWeight';
  /** Weight in grams. */
  value: Scalars['Int']['output'];
};

/** A warehouse represents a physical location where inventory is stored. */
export type Warehouse = Node & {
  __typename?: 'Warehouse';
  /** The unique code identifying this warehouse. */
  code: Scalars['String']['output'];
  /** The date and time when the warehouse was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the warehouse. */
  id: Scalars['ID']['output'];
  /** Whether this is the default warehouse for the project. */
  isDefault: Scalars['Boolean']['output'];
  /** The display name of the warehouse. */
  name: Scalars['String']['output'];
  /** Stock levels for all variants in this warehouse. */
  stock: WarehouseStockConnection;
  /** The date and time when the warehouse was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Total number of variants stocked in this warehouse. */
  variantsCount: Scalars['Int']['output'];
};


/** A warehouse represents a physical location where inventory is stored. */
export type WarehouseStockArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<WarehouseStockOrderByInput>>;
  where?: InputMaybe<WarehouseStockWhereInput>;
};

/** A connection to a list of Warehouse items. */
export type WarehouseConnection = {
  __typename?: 'WarehouseConnection';
  /** A list of edges. */
  edges: Array<WarehouseEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of warehouses. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for Warehouse */
export type WarehouseConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<WarehouseOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<WarehouseWhereInput>;
};

/** Input for creating a warehouse. */
export type WarehouseCreateInput = {
  /** The unique code for the warehouse. */
  code: Scalars['String']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The display name for the warehouse. */
  name: Scalars['String']['input'];
};

/** Payload for warehouse creation. */
export type WarehouseCreatePayload = {
  __typename?: 'WarehouseCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The created warehouse. */
  warehouse: Maybe<Warehouse>;
};

/** Input for deleting a warehouse. */
export type WarehouseDeleteInput = {
  /** The ID of the warehouse to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for warehouse deletion. */
export type WarehouseDeletePayload = {
  __typename?: 'WarehouseDeletePayload';
  /** The ID of the deleted warehouse. */
  deletedWarehouseId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Warehouse connection. */
export type WarehouseEdge = {
  __typename?: 'WarehouseEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Warehouse;
};

/** Ordering configuration for Warehouse */
export type WarehouseOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: WarehouseOrderField;
};

/** Fields available for sorting Warehouse */
export enum WarehouseOrderField {
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isDefault */
  IsDefault = 'isDefault',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Represents stock level for a variant in a specific warehouse. */
export type WarehouseStock = Node & {
  __typename?: 'WarehouseStock';
  /** The date and time when the stock was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the stock record. */
  id: Scalars['ID']['output'];
  /** The quantity currently on hand. */
  quantityOnHand: Scalars['Int']['output'];
  /** The date and time when the stock was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variant this stock record is for. */
  variant: Variant;
  /** The warehouse where this stock is located. */
  warehouse: Warehouse;
};

/** A connection to a list of WarehouseStock items. */
export type WarehouseStockConnection = {
  __typename?: 'WarehouseStockConnection';
  /** A list of edges. */
  edges: Array<WarehouseStockEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of stock records. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for WarehouseStock */
export type WarehouseStockConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<WarehouseStockOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<WarehouseStockWhereInput>;
};

/** An edge in a WarehouseStock connection. */
export type WarehouseStockEdge = {
  __typename?: 'WarehouseStockEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: WarehouseStock;
};

/** Ordering configuration for WarehouseStock */
export type WarehouseStockOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: WarehouseStockOrderField;
};

/** Fields available for sorting WarehouseStock */
export enum WarehouseStockOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by quantityOnHand */
  QuantityOnHand = 'quantityOnHand',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId',
  /** Sort by warehouseId */
  WarehouseId = 'warehouseId'
}

/** Filter conditions for WarehouseStock */
export type WarehouseStockWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<WarehouseStockWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<WarehouseStockWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<WarehouseStockWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by quantityOnHand */
  quantityOnHand?: InputMaybe<IntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<IdFilter>;
  /** Filter by warehouseId */
  warehouseId?: InputMaybe<IdFilter>;
};

/** Input for updating a warehouse. */
export type WarehouseUpdateInput = {
  /** The new code for the warehouse. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the warehouse to update. */
  id: Scalars['ID']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The new name for the warehouse. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for warehouse update. */
export type WarehouseUpdatePayload = {
  __typename?: 'WarehouseUpdatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated warehouse. */
  warehouse: Maybe<Warehouse>;
};

/** Filter conditions for Warehouse */
export type WarehouseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<WarehouseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<WarehouseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<WarehouseWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<BooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Input for setting weight (in grams). */
export type WeightInput = {
  /** Weight in grams. */
  value: Scalars['Int']['input'];
};

/** Weight measurement units */
export enum WeightUnit {
  /** Gram */
  G = 'g',
  /** Kilogram */
  Kg = 'kg',
  /** Pound */
  Lb = 'lb',
  /** Ounce */
  Oz = 'oz'
}

/**
 * Widget query namespace for dashboard widgets.
 * Only inventory-related widgets remain in Inventory service.
 * Pricing widget moved to Catalog service.
 */
export type WidgetQuery = {
  __typename?: 'WidgetQuery';
  /**
   * Get inventory widget data for a product.
   * Returns aggregated inventory metrics across all variants.
   */
  inventory: Maybe<ProductInventoryWidget>;
};


/**
 * Widget query namespace for dashboard widgets.
 * Only inventory-related widgets remain in Inventory service.
 * Pricing widget moved to Catalog service.
 */
export type WidgetQueryInventoryArgs = {
  productId: Scalars['ID']['input'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( InventoryItem ) | ( Warehouse ) | ( WarehouseStock );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BooleanFilter: BooleanFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  DimensionsInput: DimensionsInput;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  IDFilter: IdFilter;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  IntFilter: IntFilter;
  InventoryAlertThreshold: ResolverTypeWrapper<InventoryAlertThreshold>;
  InventoryBackorder: ResolverTypeWrapper<InventoryBackorder>;
  InventoryItem: ResolverTypeWrapper<InventoryItem>;
  InventoryItemConnection: ResolverTypeWrapper<InventoryItemConnection>;
  InventoryItemCost: ResolverTypeWrapper<InventoryItemCost>;
  InventoryItemCostInput: InventoryItemCostInput;
  InventoryItemDimensions: ResolverTypeWrapper<InventoryItemDimensions>;
  InventoryItemDimensionsInput: InventoryItemDimensionsInput;
  InventoryItemEdge: ResolverTypeWrapper<InventoryItemEdge>;
  InventoryItemStockInput: InventoryItemStockInput;
  InventoryItemUpdateInput: InventoryItemUpdateInput;
  InventoryItemUpdatePayload: ResolverTypeWrapper<InventoryItemUpdatePayload>;
  InventoryItemWeight: ResolverTypeWrapper<InventoryItemWeight>;
  InventoryItemWeightInput: InventoryItemWeightInput;
  InventoryItemWhereInput: InventoryItemWhereInput;
  InventoryMutation: ResolverTypeWrapper<InventoryMutation>;
  InventoryQuantities: ResolverTypeWrapper<InventoryQuantities>;
  InventoryQuery: ResolverTypeWrapper<Omit<InventoryQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  InventorySkuStatus: ResolverTypeWrapper<InventorySkuStatus>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  ProductInventoryWidget: ResolverTypeWrapper<ProductInventoryWidget>;
  Query: ResolverTypeWrapper<{}>;
  SkuStatusMetric: ResolverTypeWrapper<SkuStatusMetric>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  ThresholdMethod: ThresholdMethod;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  Variant: ResolverTypeWrapper<Variant>;
  VariantDimensions: ResolverTypeWrapper<VariantDimensions>;
  VariantWeight: ResolverTypeWrapper<VariantWeight>;
  Warehouse: ResolverTypeWrapper<Warehouse>;
  WarehouseConnection: ResolverTypeWrapper<WarehouseConnection>;
  WarehouseConnectionInput: WarehouseConnectionInput;
  WarehouseCreateInput: WarehouseCreateInput;
  WarehouseCreatePayload: ResolverTypeWrapper<WarehouseCreatePayload>;
  WarehouseDeleteInput: WarehouseDeleteInput;
  WarehouseDeletePayload: ResolverTypeWrapper<WarehouseDeletePayload>;
  WarehouseEdge: ResolverTypeWrapper<WarehouseEdge>;
  WarehouseOrderByInput: WarehouseOrderByInput;
  WarehouseOrderField: WarehouseOrderField;
  WarehouseStock: ResolverTypeWrapper<WarehouseStock>;
  WarehouseStockConnection: ResolverTypeWrapper<WarehouseStockConnection>;
  WarehouseStockConnectionInput: WarehouseStockConnectionInput;
  WarehouseStockEdge: ResolverTypeWrapper<WarehouseStockEdge>;
  WarehouseStockOrderByInput: WarehouseStockOrderByInput;
  WarehouseStockOrderField: WarehouseStockOrderField;
  WarehouseStockWhereInput: WarehouseStockWhereInput;
  WarehouseUpdateInput: WarehouseUpdateInput;
  WarehouseUpdatePayload: ResolverTypeWrapper<WarehouseUpdatePayload>;
  WarehouseWhereInput: WarehouseWhereInput;
  WeightInput: WeightInput;
  WeightUnit: WeightUnit;
  WidgetQuery: ResolverTypeWrapper<WidgetQuery>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BooleanFilter: BooleanFilter;
  Boolean: Scalars['Boolean']['output'];
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  DimensionsInput: DimensionsInput;
  Int: Scalars['Int']['output'];
  Email: Scalars['Email']['output'];
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  String: Scalars['String']['output'];
  IDFilter: IdFilter;
  ID: Scalars['ID']['output'];
  IntFilter: IntFilter;
  InventoryAlertThreshold: InventoryAlertThreshold;
  InventoryBackorder: InventoryBackorder;
  InventoryItem: InventoryItem;
  InventoryItemConnection: InventoryItemConnection;
  InventoryItemCost: InventoryItemCost;
  InventoryItemCostInput: InventoryItemCostInput;
  InventoryItemDimensions: InventoryItemDimensions;
  InventoryItemDimensionsInput: InventoryItemDimensionsInput;
  InventoryItemEdge: InventoryItemEdge;
  InventoryItemStockInput: InventoryItemStockInput;
  InventoryItemUpdateInput: InventoryItemUpdateInput;
  InventoryItemUpdatePayload: InventoryItemUpdatePayload;
  InventoryItemWeight: InventoryItemWeight;
  InventoryItemWeightInput: InventoryItemWeightInput;
  InventoryItemWhereInput: InventoryItemWhereInput;
  InventoryMutation: InventoryMutation;
  InventoryQuantities: InventoryQuantities;
  InventoryQuery: Omit<InventoryQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  InventorySkuStatus: InventorySkuStatus;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  ProductInventoryWidget: ProductInventoryWidget;
  Query: {};
  SkuStatusMetric: SkuStatusMetric;
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  Variant: Variant;
  VariantDimensions: VariantDimensions;
  VariantWeight: VariantWeight;
  Warehouse: Warehouse;
  WarehouseConnection: WarehouseConnection;
  WarehouseConnectionInput: WarehouseConnectionInput;
  WarehouseCreateInput: WarehouseCreateInput;
  WarehouseCreatePayload: WarehouseCreatePayload;
  WarehouseDeleteInput: WarehouseDeleteInput;
  WarehouseDeletePayload: WarehouseDeletePayload;
  WarehouseEdge: WarehouseEdge;
  WarehouseOrderByInput: WarehouseOrderByInput;
  WarehouseStock: WarehouseStock;
  WarehouseStockConnection: WarehouseStockConnection;
  WarehouseStockConnectionInput: WarehouseStockConnectionInput;
  WarehouseStockEdge: WarehouseStockEdge;
  WarehouseStockOrderByInput: WarehouseStockOrderByInput;
  WarehouseStockWhereInput: WarehouseStockWhereInput;
  WarehouseUpdateInput: WarehouseUpdateInput;
  WarehouseUpdatePayload: WarehouseUpdatePayload;
  WarehouseWhereInput: WarehouseWhereInput;
  WeightInput: WeightInput;
  WidgetQuery: WidgetQuery;
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryAlertThresholdResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryAlertThreshold'] = ResolversParentTypes['InventoryAlertThreshold']> = ResolversObject<{
  method?: Resolver<ResolversTypes['ThresholdMethod'], ParentType, ContextType>;
  minimumStock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryBackorderResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryBackorder'] = ResolversParentTypes['InventoryBackorder']> = ResolversObject<{
  etaAvgDays?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItem'] = ResolversParentTypes['InventoryItem']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['InventoryItem']>, { __typename: 'InventoryItem' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  continueSellingWhenOutOfStock?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dimensions?: Resolver<Maybe<ResolversTypes['InventoryItemDimensions']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stock?: Resolver<Array<ResolversTypes['WarehouseStock']>, ParentType, ContextType>;
  totalAvailable?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  trackInventory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  unitCost?: Resolver<Maybe<ResolversTypes['InventoryItemCost']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variantId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  weight?: Resolver<Maybe<ResolversTypes['InventoryItemWeight']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemConnection'] = ResolversParentTypes['InventoryItemConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['InventoryItemEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemCostResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemCost'] = ResolversParentTypes['InventoryItemCost']> = ResolversObject<{
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemDimensionsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemDimensions'] = ResolversParentTypes['InventoryItemDimensions']> = ResolversObject<{
  displayUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  heightMm?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lengthMm?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  widthMm?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemEdge'] = ResolversParentTypes['InventoryItemEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['InventoryItem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemUpdatePayload'] = ResolversParentTypes['InventoryItemUpdatePayload']> = ResolversObject<{
  inventoryItem?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemWeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemWeight'] = ResolversParentTypes['InventoryItemWeight']> = ResolversObject<{
  displayUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  weightGrams?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryMutation'] = ResolversParentTypes['InventoryMutation']> = ResolversObject<{
  inventoryItemUpdate?: Resolver<ResolversTypes['InventoryItemUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationInventoryItemUpdateArgs, 'input'>>;
  warehouseCreate?: Resolver<ResolversTypes['WarehouseCreatePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseCreateArgs, 'input'>>;
  warehouseDelete?: Resolver<ResolversTypes['WarehouseDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseDeleteArgs, 'input'>>;
  warehouseUpdate?: Resolver<ResolversTypes['WarehouseUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryQuantitiesResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryQuantities'] = ResolversParentTypes['InventoryQuantities']> = ResolversObject<{
  availableForSale?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  onHand?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reserved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unavailable?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryQuery'] = ResolversParentTypes['InventoryQuery']> = ResolversObject<{
  inventoryItem?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType, RequireFields<InventoryQueryInventoryItemArgs, 'id'>>;
  inventoryItemByVariant?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType, RequireFields<InventoryQueryInventoryItemByVariantArgs, 'variantId'>>;
  inventoryItems?: Resolver<ResolversTypes['InventoryItemConnection'], ParentType, ContextType, Partial<InventoryQueryInventoryItemsArgs>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<InventoryQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<InventoryQueryNodesArgs, 'ids'>>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType, RequireFields<InventoryQueryWarehouseArgs, 'id'>>;
  warehouses?: Resolver<ResolversTypes['WarehouseConnection'], ParentType, ContextType, Partial<InventoryQueryWarehousesArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventorySkuStatusResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventorySkuStatus'] = ResolversParentTypes['InventorySkuStatus']> = ResolversObject<{
  backorder?: Resolver<ResolversTypes['SkuStatusMetric'], ParentType, ContextType>;
  lowStock?: Resolver<ResolversTypes['SkuStatusMetric'], ParentType, ContextType>;
  outOfStock?: Resolver<ResolversTypes['SkuStatusMetric'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  inventoryMutation?: Resolver<ResolversTypes['InventoryMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'InventoryItem' | 'Warehouse' | 'WarehouseStock', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductInventoryWidgetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductInventoryWidget'] = ResolversParentTypes['ProductInventoryWidget']> = ResolversObject<{
  alertThreshold?: Resolver<ResolversTypes['InventoryAlertThreshold'], ParentType, ContextType>;
  availableChange7d?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  backorder?: Resolver<ResolversTypes['InventoryBackorder'], ParentType, ContextType>;
  quantities?: Resolver<ResolversTypes['InventoryQuantities'], ParentType, ContextType>;
  skuStatus?: Resolver<ResolversTypes['InventorySkuStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  inventoryQuery?: Resolver<ResolversTypes['InventoryQuery'], ParentType, ContextType>;
  widgetQuery?: Resolver<ResolversTypes['WidgetQuery'], ParentType, ContextType>;
}>;

export type SkuStatusMetricResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SkuStatusMetric'] = ResolversParentTypes['SkuStatusMetric']> = ResolversObject<{
  averageDays?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Variant'] = ResolversParentTypes['Variant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Variant']>, { __typename: 'Variant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  inventoryItem?: Resolver<Maybe<ResolversTypes['InventoryItem']>, { __typename: 'Variant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantDimensionsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantDimensions'] = ResolversParentTypes['VariantDimensions']> = ResolversObject<{
  height?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantWeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantWeight'] = ResolversParentTypes['VariantWeight']> = ResolversObject<{
  value?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Warehouse'] = ResolversParentTypes['Warehouse']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Warehouse']>, { __typename: 'Warehouse' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stock?: Resolver<ResolversTypes['WarehouseStockConnection'], ParentType, ContextType, Partial<WarehouseStockArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variantsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseConnection'] = ResolversParentTypes['WarehouseConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WarehouseEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseCreatePayload'] = ResolversParentTypes['WarehouseCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseDeletePayload'] = ResolversParentTypes['WarehouseDeletePayload']> = ResolversObject<{
  deletedWarehouseId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseEdge'] = ResolversParentTypes['WarehouseEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Warehouse'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStock'] = ResolversParentTypes['WarehouseStock']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantityOnHand?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<ResolversTypes['Variant'], ParentType, ContextType>;
  warehouse?: Resolver<ResolversTypes['Warehouse'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockConnection'] = ResolversParentTypes['WarehouseStockConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WarehouseStockEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockEdge'] = ResolversParentTypes['WarehouseStockEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['WarehouseStock'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseUpdatePayload'] = ResolversParentTypes['WarehouseUpdatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WidgetQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WidgetQuery'] = ResolversParentTypes['WidgetQuery']> = ResolversObject<{
  inventory?: Resolver<Maybe<ResolversTypes['ProductInventoryWidget']>, ParentType, ContextType, RequireFields<WidgetQueryInventoryArgs, 'productId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  InventoryAlertThreshold?: InventoryAlertThresholdResolvers<ContextType>;
  InventoryBackorder?: InventoryBackorderResolvers<ContextType>;
  InventoryItem?: InventoryItemResolvers<ContextType>;
  InventoryItemConnection?: InventoryItemConnectionResolvers<ContextType>;
  InventoryItemCost?: InventoryItemCostResolvers<ContextType>;
  InventoryItemDimensions?: InventoryItemDimensionsResolvers<ContextType>;
  InventoryItemEdge?: InventoryItemEdgeResolvers<ContextType>;
  InventoryItemUpdatePayload?: InventoryItemUpdatePayloadResolvers<ContextType>;
  InventoryItemWeight?: InventoryItemWeightResolvers<ContextType>;
  InventoryMutation?: InventoryMutationResolvers<ContextType>;
  InventoryQuantities?: InventoryQuantitiesResolvers<ContextType>;
  InventoryQuery?: InventoryQueryResolvers<ContextType>;
  InventorySkuStatus?: InventorySkuStatusResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  ProductInventoryWidget?: ProductInventoryWidgetResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SkuStatusMetric?: SkuStatusMetricResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  Variant?: VariantResolvers<ContextType>;
  VariantDimensions?: VariantDimensionsResolvers<ContextType>;
  VariantWeight?: VariantWeightResolvers<ContextType>;
  Warehouse?: WarehouseResolvers<ContextType>;
  WarehouseConnection?: WarehouseConnectionResolvers<ContextType>;
  WarehouseCreatePayload?: WarehouseCreatePayloadResolvers<ContextType>;
  WarehouseDeletePayload?: WarehouseDeletePayloadResolvers<ContextType>;
  WarehouseEdge?: WarehouseEdgeResolvers<ContextType>;
  WarehouseStock?: WarehouseStockResolvers<ContextType>;
  WarehouseStockConnection?: WarehouseStockConnectionResolvers<ContextType>;
  WarehouseStockEdge?: WarehouseStockEdgeResolvers<ContextType>;
  WarehouseUpdatePayload?: WarehouseUpdatePayloadResolvers<ContextType>;
  WidgetQuery?: WidgetQueryResolvers<ContextType>;
}>;

