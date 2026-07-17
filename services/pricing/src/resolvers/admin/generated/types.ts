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
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

export type BigIntFilter = {
  _between?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  _eq?: InputMaybe<Scalars['BigInt']['input']>;
  _gt?: InputMaybe<Scalars['BigInt']['input']>;
  _gte?: InputMaybe<Scalars['BigInt']['input']>;
  _in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['BigInt']['input']>;
  _lte?: InputMaybe<Scalars['BigInt']['input']>;
  _neq?: InputMaybe<Scalars['BigInt']['input']>;
  _notIn?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

export type BooleanFilter = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Category = Node & {
  __typename?: 'Category';
  id: Scalars['ID']['output'];
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

export type Customer = Node & {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
};

export type DateTimeFilter = {
  _between?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  _in?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['DateTime']['input']>;
  _lte?: InputMaybe<Scalars['DateTime']['input']>;
  _neq?: InputMaybe<Scalars['DateTime']['input']>;
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

/** A store-scoped native discount aggregate owned by Pricing. */
export type Discount = Node & {
  __typename?: 'Discount';
  appliesOnOneTimePurchase: Scalars['Boolean']['output'];
  appliesOnSubscription: Scalars['Boolean']['output'];
  appliesOncePerCustomer: Scalars['Boolean']['output'];
  archivedAt: Maybe<Scalars['DateTime']['output']>;
  buyerContext: DiscountBuyerContext;
  channelCodes: Array<Scalars['String']['output']>;
  channels: Array<DiscountChannel>;
  codes: DiscountCodeConnection;
  codesCount: Scalars['Int']['output'];
  combinations: Array<DiscountCombination>;
  combinesWithOrderDiscounts: Scalars['Boolean']['output'];
  combinesWithProductDiscounts: Scalars['Boolean']['output'];
  combinesWithShippingDiscounts: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdById: Maybe<Scalars['String']['output']>;
  currency: CurrencyCode;
  discountClass: DiscountClass;
  effectiveStatus: DiscountEffectiveStatus;
  endsAt: Maybe<Scalars['DateTime']['output']>;
  externalReferences: DiscountExternalReferenceConnection;
  featuredChannelCodes: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: DiscountKind;
  metadata: Scalars['JSON']['output'];
  method: DiscountMethod;
  minimumRequirement: Maybe<DiscountMinimumRequirement>;
  /** First active code, or the oldest code when all codes are disabled. */
  primaryCode: Maybe<Scalars['String']['output']>;
  priority: Scalars['Int']['output'];
  redemptions: DiscountRedemptionConnection;
  reservedUsageCount: Scalars['BigInt']['output'];
  revision: Scalars['Int']['output'];
  /** Exactly one rule subtype is present for a complete aggregate. */
  rule: Maybe<DiscountRule>;
  startsAt: Scalars['DateTime']['output'];
  state: DiscountState;
  tags: Array<Scalars['String']['output']>;
  targetSelections: Array<DiscountTargetSelection>;
  title: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  usage: DiscountUsageSummary;
  usageCount: Scalars['BigInt']['output'];
  usageLimit: Maybe<Scalars['BigInt']['output']>;
  usageReservations: DiscountUsageReservationConnection;
};


/** A store-scoped native discount aggregate owned by Pricing. */
export type DiscountCodesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountCodeOrderByInput>>;
  where?: InputMaybe<DiscountCodeWhereInput>;
};


/** A store-scoped native discount aggregate owned by Pricing. */
export type DiscountExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountExternalReferenceOrderByInput>>;
  where?: InputMaybe<DiscountExternalReferenceWhereInput>;
};


/** A store-scoped native discount aggregate owned by Pricing. */
export type DiscountRedemptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountRedemptionOrderByInput>>;
  where?: InputMaybe<DiscountRedemptionWhereInput>;
};


/** A store-scoped native discount aggregate owned by Pricing. */
export type DiscountUsageReservationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountUsageReservationOrderByInput>>;
  where?: InputMaybe<DiscountUsageReservationWhereInput>;
};

export enum DiscountAllocationMethod {
  Across = 'ACROSS',
  Each = 'EACH'
}

export enum DiscountAllocationTargetType {
  Order = 'ORDER',
  OrderLine = 'ORDER_LINE',
  ShippingLine = 'SHIPPING_LINE'
}

/** Percentage or fixed-amount rule used by product and order discounts. */
export type DiscountAmountOffRule = {
  __typename?: 'DiscountAmountOffRule';
  allocationMethod: DiscountAllocationMethod;
  amountMinor: Maybe<Scalars['BigInt']['output']>;
  maximumDiscountMinor: Maybe<Scalars['BigInt']['output']>;
  percentageBps: Maybe<Scalars['Int']['output']>;
  valueType: DiscountValueType;
};

export type DiscountAmountOffRuleInput = {
  /** Defaults to ACROSS when omitted. */
  allocationMethod?: InputMaybe<DiscountAllocationMethod>;
  amountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  maximumDiscountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  percentageBps?: InputMaybe<Scalars['Int']['input']>;
  valueType: DiscountValueType;
};

export type DiscountBuyXGetYRule = {
  __typename?: 'DiscountBuyXGetYRule';
  benefitAmountMinor: Maybe<Scalars['BigInt']['output']>;
  benefitPercentageBps: Maybe<Scalars['Int']['output']>;
  benefitQuantity: Scalars['Int']['output'];
  benefitValueType: DiscountValueType;
  requiredQuantity: Maybe<Scalars['Int']['output']>;
  requiredSubtotalMinor: Maybe<Scalars['BigInt']['output']>;
  requirementType: DiscountRequirementType;
  usesPerOrderLimit: Maybe<Scalars['Int']['output']>;
};

export type DiscountBuyXGetYRuleInput = {
  benefitAmountMinor?: InputMaybe<Scalars['BigInt']['input']>;
  benefitPercentageBps?: InputMaybe<Scalars['Int']['input']>;
  benefitQuantity: Scalars['Int']['input'];
  benefitValueType: DiscountValueType;
  requiredQuantity?: InputMaybe<Scalars['Int']['input']>;
  requiredSubtotalMinor?: InputMaybe<Scalars['BigInt']['input']>;
  requirementType: DiscountRequirementType;
  usesPerOrderLimit?: InputMaybe<Scalars['Int']['input']>;
};

export type DiscountBuyerContext = {
  __typename?: 'DiscountBuyerContext';
  createdAt: Scalars['DateTime']['output'];
  customers: Array<DiscountEligibleCustomer>;
  segments: Array<DiscountEligibleSegment>;
  type: DiscountBuyerContextType;
  updatedAt: Scalars['DateTime']['output'];
};

export type DiscountBuyerContextInput = {
  customerIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  segmentIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  type: DiscountBuyerContextType;
};

export enum DiscountBuyerContextType {
  All = 'ALL',
  Customers = 'CUSTOMERS',
  Segments = 'SEGMENTS'
}

export type DiscountCatalogTarget = Category | Product | Variant;

export type DiscountChannel = {
  __typename?: 'DiscountChannel';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  featured: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type DiscountChannelInput = {
  code: Scalars['String']['input'];
  featured?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum DiscountClass {
  Order = 'ORDER',
  Product = 'PRODUCT',
  Shipping = 'SHIPPING'
}

export type DiscountClassFilter = {
  _eq?: InputMaybe<DiscountClass>;
  _in?: InputMaybe<Array<DiscountClass>>;
  _neq?: InputMaybe<DiscountClass>;
  _notIn?: InputMaybe<Array<DiscountClass>>;
};

/** A redeemable code and its usage projection. */
export type DiscountCode = Node & {
  __typename?: 'DiscountCode';
  code: Scalars['String']['output'];
  committedCount: Scalars['BigInt']['output'];
  createdAt: Scalars['DateTime']['output'];
  disabledAt: Maybe<Scalars['DateTime']['output']>;
  discount: Discount;
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  normalizedCode: Scalars['String']['output'];
  remainingCount: Maybe<Scalars['BigInt']['output']>;
  reservedCount: Scalars['BigInt']['output'];
  reversedCount: Scalars['BigInt']['output'];
  status: DiscountCodeStatus;
  updatedAt: Scalars['DateTime']['output'];
  usageCount: Scalars['BigInt']['output'];
  usageLimit: Maybe<Scalars['BigInt']['output']>;
};

export type DiscountCodeConnection = {
  __typename?: 'DiscountCodeConnection';
  edges: Array<DiscountCodeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DiscountCodeCreateOperationInput = {
  /** Client-provided correlation key returned in the operation result. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  usageLimit?: InputMaybe<Scalars['BigInt']['input']>;
};

export type DiscountCodeDeleteOperationInput = {
  codeId: Scalars['ID']['input'];
  expectedUpdatedAt: Scalars['DateTime']['input'];
};

export type DiscountCodeEdge = {
  __typename?: 'DiscountCodeEdge';
  cursor: Scalars['String']['output'];
  node: DiscountCode;
};

export type DiscountCodeOrderByInput = {
  direction: SortDirection;
  field: DiscountCodeOrderField;
};

export enum DiscountCodeOrderField {
  Code = 'code',
  CreatedAt = 'createdAt',
  DisabledAt = 'disabledAt',
  Id = 'id',
  NormalizedCode = 'normalizedCode',
  RemainingCount = 'remainingCount',
  ReservedCount = 'reservedCount',
  Status = 'status',
  UpdatedAt = 'updatedAt',
  UsageCount = 'usageCount',
  UsageLimit = 'usageLimit'
}

export enum DiscountCodeStatus {
  Active = 'ACTIVE',
  Disabled = 'DISABLED'
}

export type DiscountCodeStatusFilter = {
  _eq?: InputMaybe<DiscountCodeStatus>;
  _in?: InputMaybe<Array<DiscountCodeStatus>>;
  _neq?: InputMaybe<DiscountCodeStatus>;
  _notIn?: InputMaybe<Array<DiscountCodeStatus>>;
};

export type DiscountCodeUpdateOperationInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  codeId: Scalars['ID']['input'];
  expectedUpdatedAt: Scalars['DateTime']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  status?: InputMaybe<DiscountCodeStatus>;
  usageLimit?: InputMaybe<Scalars['BigInt']['input']>;
};

export type DiscountCodeWhereInput = {
  _and?: InputMaybe<Array<DiscountCodeWhereInput>>;
  _not?: InputMaybe<DiscountCodeWhereInput>;
  _or?: InputMaybe<Array<DiscountCodeWhereInput>>;
  code?: InputMaybe<StringFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  disabledAt?: InputMaybe<DateTimeFilter>;
  discountId?: InputMaybe<IdFilter>;
  id?: InputMaybe<IdFilter>;
  normalizedCode?: InputMaybe<StringFilter>;
  remainingCount?: InputMaybe<BigIntFilter>;
  reservedCount?: InputMaybe<BigIntFilter>;
  status?: InputMaybe<DiscountCodeStatusFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  usageCount?: InputMaybe<BigIntFilter>;
  usageLimit?: InputMaybe<BigIntFilter>;
};

export type DiscountCodesUpdateInput = {
  create?: InputMaybe<Array<DiscountCodeCreateOperationInput>>;
  delete?: InputMaybe<Array<DiscountCodeDeleteOperationInput>>;
  update?: InputMaybe<Array<DiscountCodeUpdateOperationInput>>;
};

export type DiscountCombination = {
  __typename?: 'DiscountCombination';
  createdAt: Scalars['DateTime']['output'];
  discountClass: DiscountClass;
};

export type DiscountConnection = {
  __typename?: 'DiscountConnection';
  edges: Array<DiscountEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DiscountCreateInput = {
  buyerContext?: InputMaybe<DiscountBuyerContextInput>;
  channels?: InputMaybe<Array<DiscountChannelInput>>;
  codes?: InputMaybe<Array<DiscountCodeCreateOperationInput>>;
  combinesWith?: InputMaybe<Array<DiscountClass>>;
  currency: CurrencyCode;
  kind: DiscountKind;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  method: DiscountMethod;
  minimumRequirement?: InputMaybe<DiscountMinimumRequirementInput>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  purchaseModes?: InputMaybe<DiscountPurchaseModesInput>;
  rule?: InputMaybe<DiscountRuleInput>;
  schedule?: InputMaybe<DiscountScheduleInput>;
  /** Defaults to DRAFT when omitted. */
  state?: InputMaybe<DiscountState>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  targetSelections?: InputMaybe<Array<DiscountTargetSelectionInput>>;
  title?: InputMaybe<Scalars['String']['input']>;
  usage?: InputMaybe<DiscountUsageLimitsInput>;
};

export type DiscountCreatePayload = {
  __typename?: 'DiscountCreatePayload';
  discount: Maybe<Discount>;
  userErrors: Array<GenericUserError>;
};

export type DiscountCurrencyFilter = {
  _eq?: InputMaybe<CurrencyCode>;
  _in?: InputMaybe<Array<CurrencyCode>>;
  _neq?: InputMaybe<CurrencyCode>;
  _notIn?: InputMaybe<Array<CurrencyCode>>;
};

export type DiscountDefinitionUpdateInput = {
  priority?: InputMaybe<Scalars['Int']['input']>;
  purchaseModes?: InputMaybe<DiscountPurchaseModesInput>;
  schedule?: InputMaybe<DiscountScheduleInput>;
  title?: InputMaybe<Scalars['String']['input']>;
  usage?: InputMaybe<DiscountUsageLimitsInput>;
};

export type DiscountDeleteInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
};

export type DiscountDeletePayload = {
  __typename?: 'DiscountDeletePayload';
  deletedDiscountId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type DiscountEdge = {
  __typename?: 'DiscountEdge';
  cursor: Scalars['String']['output'];
  node: Discount;
};

/** Lifecycle plus schedule-derived state used by Admin list views. */
export enum DiscountEffectiveStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Expired = 'EXPIRED',
  Paused = 'PAUSED',
  Scheduled = 'SCHEDULED'
}

export type DiscountEffectiveStatusFilter = {
  _eq?: InputMaybe<DiscountEffectiveStatus>;
  _in?: InputMaybe<Array<DiscountEffectiveStatus>>;
  _neq?: InputMaybe<DiscountEffectiveStatus>;
  _notIn?: InputMaybe<Array<DiscountEffectiveStatus>>;
};

export type DiscountEligibleCustomer = {
  __typename?: 'DiscountEligibleCustomer';
  createdAt: Scalars['DateTime']['output'];
  customer: Maybe<Customer>;
  customerId: Scalars['ID']['output'];
  referenceCheckedAt: Maybe<Scalars['DateTime']['output']>;
  referenceStatus: DiscountReferenceStatus;
  referenceStatusChangedAt: Maybe<Scalars['DateTime']['output']>;
};

export type DiscountEligibleSegment = {
  __typename?: 'DiscountEligibleSegment';
  createdAt: Scalars['DateTime']['output'];
  referenceCheckedAt: Maybe<Scalars['DateTime']['output']>;
  referenceStatus: DiscountReferenceStatus;
  referenceStatusChangedAt: Maybe<Scalars['DateTime']['output']>;
  segmentId: Scalars['ID']['output'];
};

export type DiscountExternalReference = Node & {
  __typename?: 'DiscountExternalReference';
  contentChecksum: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  direction: DiscountExternalSyncDirection;
  discount: Discount;
  etag: Maybe<Scalars['String']['output']>;
  externalId: Scalars['String']['output'];
  externalSystem: Scalars['String']['output'];
  externalType: Scalars['String']['output'];
  externalUrl: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastError: Maybe<Scalars['String']['output']>;
  lastSyncedAt: Maybe<Scalars['DateTime']['output']>;
  metadata: Scalars['JSON']['output'];
  syncStatus: DiscountExternalSyncStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type DiscountExternalReferenceConnection = {
  __typename?: 'DiscountExternalReferenceConnection';
  edges: Array<DiscountExternalReferenceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DiscountExternalReferenceCreateInput = {
  direction: DiscountExternalSyncDirection;
  discountId: Scalars['ID']['input'];
  externalId: Scalars['String']['input'];
  externalSystem: Scalars['String']['input'];
  externalType?: InputMaybe<Scalars['String']['input']>;
  externalUrl?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type DiscountExternalReferenceCreatePayload = {
  __typename?: 'DiscountExternalReferenceCreatePayload';
  externalReference: Maybe<DiscountExternalReference>;
  userErrors: Array<GenericUserError>;
};

export type DiscountExternalReferenceDeleteInput = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  id: Scalars['ID']['input'];
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type DiscountExternalReferenceDeletePayload = {
  __typename?: 'DiscountExternalReferenceDeletePayload';
  deletedExternalReferenceId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type DiscountExternalReferenceEdge = {
  __typename?: 'DiscountExternalReferenceEdge';
  cursor: Scalars['String']['output'];
  node: DiscountExternalReference;
};

export type DiscountExternalReferenceIdentityInput = {
  externalId?: InputMaybe<Scalars['String']['input']>;
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  externalType?: InputMaybe<Scalars['String']['input']>;
  externalUrl?: InputMaybe<Scalars['String']['input']>;
};

export type DiscountExternalReferenceOrderByInput = {
  direction: SortDirection;
  field: DiscountExternalReferenceOrderField;
};

export enum DiscountExternalReferenceOrderField {
  CreatedAt = 'createdAt',
  DeletedAt = 'deletedAt',
  Direction = 'direction',
  ExternalId = 'externalId',
  ExternalSystem = 'externalSystem',
  ExternalType = 'externalType',
  Id = 'id',
  LastSyncedAt = 'lastSyncedAt',
  SyncStatus = 'syncStatus',
  UpdatedAt = 'updatedAt'
}

export type DiscountExternalReferenceSyncInput = {
  contentChecksum?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<DiscountExternalSyncDirection>;
  etag?: InputMaybe<Scalars['String']['input']>;
  lastError?: InputMaybe<Scalars['String']['input']>;
  lastSyncedAt?: InputMaybe<Scalars['DateTime']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  status?: InputMaybe<DiscountExternalSyncStatus>;
};

export type DiscountExternalReferenceUpdateInput = {
  identity?: InputMaybe<DiscountExternalReferenceIdentityInput>;
  sync?: InputMaybe<DiscountExternalReferenceSyncInput>;
};

export type DiscountExternalReferenceUpdatePayload = {
  __typename?: 'DiscountExternalReferenceUpdatePayload';
  externalReference: Maybe<DiscountExternalReference>;
  operationResults: Array<DiscountOperationResult>;
  userErrors: Array<GenericUserError>;
};

export type DiscountExternalReferenceWhereInput = {
  _and?: InputMaybe<Array<DiscountExternalReferenceWhereInput>>;
  _not?: InputMaybe<DiscountExternalReferenceWhereInput>;
  _or?: InputMaybe<Array<DiscountExternalReferenceWhereInput>>;
  createdAt?: InputMaybe<DateTimeFilter>;
  deletedAt?: InputMaybe<DateTimeFilter>;
  direction?: InputMaybe<DiscountExternalSyncDirectionFilter>;
  discountId?: InputMaybe<IdFilter>;
  externalId?: InputMaybe<StringFilter>;
  externalSystem?: InputMaybe<StringFilter>;
  externalType?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  lastSyncedAt?: InputMaybe<DateTimeFilter>;
  syncStatus?: InputMaybe<DiscountExternalSyncStatusFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export enum DiscountExternalSyncDirection {
  Bidirectional = 'BIDIRECTIONAL',
  Export = 'EXPORT',
  Import = 'IMPORT'
}

export type DiscountExternalSyncDirectionFilter = {
  _eq?: InputMaybe<DiscountExternalSyncDirection>;
  _in?: InputMaybe<Array<DiscountExternalSyncDirection>>;
  _neq?: InputMaybe<DiscountExternalSyncDirection>;
  _notIn?: InputMaybe<Array<DiscountExternalSyncDirection>>;
};

export enum DiscountExternalSyncStatus {
  Disabled = 'DISABLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Synced = 'SYNCED'
}

export type DiscountExternalSyncStatusFilter = {
  _eq?: InputMaybe<DiscountExternalSyncStatus>;
  _in?: InputMaybe<Array<DiscountExternalSyncStatus>>;
  _neq?: InputMaybe<DiscountExternalSyncStatus>;
  _notIn?: InputMaybe<Array<DiscountExternalSyncStatus>>;
};

export type DiscountFreeShippingRule = {
  __typename?: 'DiscountFreeShippingRule';
  maximumShippingPriceMinor: Maybe<Scalars['BigInt']['output']>;
};

export type DiscountFreeShippingRuleInput = {
  maximumShippingPriceMinor?: InputMaybe<Scalars['BigInt']['input']>;
};

export enum DiscountKind {
  AmountOffOrder = 'AMOUNT_OFF_ORDER',
  AmountOffProducts = 'AMOUNT_OFF_PRODUCTS',
  BuyXGetY = 'BUY_X_GET_Y',
  FreeShipping = 'FREE_SHIPPING'
}

export type DiscountKindFilter = {
  _eq?: InputMaybe<DiscountKind>;
  _in?: InputMaybe<Array<DiscountKind>>;
  _neq?: InputMaybe<DiscountKind>;
  _notIn?: InputMaybe<Array<DiscountKind>>;
};

export type DiscountLifecycleUpdateInput = {
  state: DiscountState;
};

export enum DiscountMethod {
  Automatic = 'AUTOMATIC',
  Code = 'CODE'
}

export type DiscountMethodFilter = {
  _eq?: InputMaybe<DiscountMethod>;
  _in?: InputMaybe<Array<DiscountMethod>>;
  _neq?: InputMaybe<DiscountMethod>;
  _notIn?: InputMaybe<Array<DiscountMethod>>;
};

export type DiscountMinimumRequirement = {
  __typename?: 'DiscountMinimumRequirement';
  quantity: Maybe<Scalars['Int']['output']>;
  requirementType: DiscountRequirementType;
  subtotalMinor: Maybe<Scalars['BigInt']['output']>;
};

export type DiscountMinimumRequirementInput = {
  quantity?: InputMaybe<Scalars['Int']['input']>;
  requirementType: DiscountRequirementType;
  subtotalMinor?: InputMaybe<Scalars['BigInt']['input']>;
};

/** Wrapper used by updates so a null requirement can explicitly clear it. */
export type DiscountMinimumRequirementSyncInput = {
  requirement?: InputMaybe<DiscountMinimumRequirementInput>;
};

/** Result of one section in a discount aggregate update. */
export type DiscountOperationResult = {
  __typename?: 'DiscountOperationResult';
  applied: Scalars['Boolean']['output'];
  errors: Array<GenericUserError>;
  type: DiscountOperationType;
};

/** Sections executed by the unified discountUpdate workflow. */
export enum DiscountOperationType {
  ChannelsUpdate = 'CHANNELS_UPDATE',
  CodesUpdate = 'CODES_UPDATE',
  CombinationsUpdate = 'COMBINATIONS_UPDATE',
  DefinitionUpdate = 'DEFINITION_UPDATE',
  EligibilityUpdate = 'ELIGIBILITY_UPDATE',
  ExternalReferenceUpdate = 'EXTERNAL_REFERENCE_UPDATE',
  LifecycleUpdate = 'LIFECYCLE_UPDATE',
  MetadataUpdate = 'METADATA_UPDATE',
  MinimumRequirementUpdate = 'MINIMUM_REQUIREMENT_UPDATE',
  RuleUpdate = 'RULE_UPDATE',
  TagsUpdate = 'TAGS_UPDATE',
  TargetsUpdate = 'TARGETS_UPDATE'
}

export type DiscountOrderByInput = {
  direction: SortDirection;
  field: DiscountOrderField;
};

export enum DiscountOrderField {
  ArchivedAt = 'archivedAt',
  CodesCount = 'codesCount',
  CreatedAt = 'createdAt',
  Currency = 'currency',
  DiscountClass = 'discountClass',
  EffectiveStatus = 'effectiveStatus',
  EndsAt = 'endsAt',
  Id = 'id',
  Kind = 'kind',
  Method = 'method',
  PrimaryCode = 'primaryCode',
  Priority = 'priority',
  ReservedUsageCount = 'reservedUsageCount',
  Revision = 'revision',
  StartsAt = 'startsAt',
  State = 'state',
  Title = 'title',
  UpdatedAt = 'updatedAt',
  UsageCount = 'usageCount',
  UsageLimit = 'usageLimit'
}

export type DiscountPurchaseModesInput = {
  appliesOnOneTimePurchase: Scalars['Boolean']['input'];
  appliesOnSubscription: Scalars['Boolean']['input'];
};

/** Order-level discount accounting header. */
export type DiscountRedemption = Node & {
  __typename?: 'DiscountRedemption';
  allocations: Array<DiscountRedemptionAllocation>;
  amountMinor: Scalars['BigInt']['output'];
  checkoutId: Scalars['ID']['output'];
  committedAt: Scalars['DateTime']['output'];
  configurationRevision: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency: CurrencyCode;
  customer: Maybe<Customer>;
  customerId: Maybe<Scalars['ID']['output']>;
  discount: Discount;
  discountClass: DiscountClass;
  discountCode: Maybe<DiscountCode>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  metadata: Scalars['JSON']['output'];
  orderId: Scalars['ID']['output'];
  reservation: Maybe<DiscountUsageReservation>;
  reversalReason: Maybe<Scalars['String']['output']>;
  reversedAt: Maybe<Scalars['DateTime']['output']>;
  status: DiscountRedemptionStatus;
};

export type DiscountRedemptionAllocation = Node & {
  __typename?: 'DiscountRedemptionAllocation';
  amountMinor: Scalars['BigInt']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  quantity: Maybe<Scalars['Int']['output']>;
  redemption: DiscountRedemption;
  targetId: Maybe<Scalars['ID']['output']>;
  targetType: DiscountAllocationTargetType;
};

export type DiscountRedemptionConnection = {
  __typename?: 'DiscountRedemptionConnection';
  edges: Array<DiscountRedemptionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DiscountRedemptionEdge = {
  __typename?: 'DiscountRedemptionEdge';
  cursor: Scalars['String']['output'];
  node: DiscountRedemption;
};

export type DiscountRedemptionOrderByInput = {
  direction: SortDirection;
  field: DiscountRedemptionOrderField;
};

export enum DiscountRedemptionOrderField {
  AmountMinor = 'amountMinor',
  CommittedAt = 'committedAt',
  ConfigurationRevision = 'configurationRevision',
  CreatedAt = 'createdAt',
  Currency = 'currency',
  DiscountClass = 'discountClass',
  Id = 'id',
  ReversedAt = 'reversedAt',
  Status = 'status'
}

export enum DiscountRedemptionStatus {
  Committed = 'COMMITTED',
  Reversed = 'REVERSED'
}

export type DiscountRedemptionStatusFilter = {
  _eq?: InputMaybe<DiscountRedemptionStatus>;
  _in?: InputMaybe<Array<DiscountRedemptionStatus>>;
  _neq?: InputMaybe<DiscountRedemptionStatus>;
  _notIn?: InputMaybe<Array<DiscountRedemptionStatus>>;
};

export type DiscountRedemptionWhereInput = {
  _and?: InputMaybe<Array<DiscountRedemptionWhereInput>>;
  _not?: InputMaybe<DiscountRedemptionWhereInput>;
  _or?: InputMaybe<Array<DiscountRedemptionWhereInput>>;
  amountMinor?: InputMaybe<BigIntFilter>;
  checkoutId?: InputMaybe<IdFilter>;
  codeId?: InputMaybe<IdFilter>;
  committedAt?: InputMaybe<DateTimeFilter>;
  configurationRevision?: InputMaybe<IntFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  currency?: InputMaybe<DiscountCurrencyFilter>;
  customerId?: InputMaybe<IdFilter>;
  discountClass?: InputMaybe<DiscountClassFilter>;
  discountId?: InputMaybe<IdFilter>;
  id?: InputMaybe<IdFilter>;
  orderId?: InputMaybe<IdFilter>;
  reservationId?: InputMaybe<IdFilter>;
  reversedAt?: InputMaybe<DateTimeFilter>;
  status?: InputMaybe<DiscountRedemptionStatusFilter>;
};

export enum DiscountReferenceStatus {
  Stale = 'STALE',
  Valid = 'VALID'
}

export enum DiscountRequirementType {
  Quantity = 'QUANTITY',
  Subtotal = 'SUBTOTAL'
}

export enum DiscountReservationStatus {
  Active = 'ACTIVE',
  Committed = 'COMMITTED',
  Expired = 'EXPIRED',
  Released = 'RELEASED'
}

export type DiscountReservationStatusFilter = {
  _eq?: InputMaybe<DiscountReservationStatus>;
  _in?: InputMaybe<Array<DiscountReservationStatus>>;
  _neq?: InputMaybe<DiscountReservationStatus>;
  _notIn?: InputMaybe<Array<DiscountReservationStatus>>;
};

export type DiscountRule = DiscountAmountOffRule | DiscountBuyXGetYRule | DiscountFreeShippingRule;

/** Exactly one rule field must match the owning discount kind. */
export type DiscountRuleInput = {
  amountOff?: InputMaybe<DiscountAmountOffRuleInput>;
  buyXGetY?: InputMaybe<DiscountBuyXGetYRuleInput>;
  freeShipping?: InputMaybe<DiscountFreeShippingRuleInput>;
};

export type DiscountScheduleInput = {
  endsAt?: InputMaybe<Scalars['DateTime']['input']>;
  startsAt: Scalars['DateTime']['input'];
};

export enum DiscountState {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Paused = 'PAUSED'
}

export type DiscountStateFilter = {
  _eq?: InputMaybe<DiscountState>;
  _in?: InputMaybe<Array<DiscountState>>;
  _neq?: InputMaybe<DiscountState>;
  _notIn?: InputMaybe<Array<DiscountState>>;
};

/** A long-lived cross-service target reference and its reconciliation state. */
export type DiscountTarget = {
  __typename?: 'DiscountTarget';
  createdAt: Scalars['DateTime']['output'];
  referenceCheckedAt: Maybe<Scalars['DateTime']['output']>;
  referenceStatus: DiscountReferenceStatus;
  referenceStatusChangedAt: Maybe<Scalars['DateTime']['output']>;
  target: Maybe<DiscountCatalogTarget>;
  targetId: Scalars['ID']['output'];
  targetType: DiscountTargetType;
};

export enum DiscountTargetRole {
  Benefit = 'BENEFIT',
  Qualifier = 'QUALIFIER'
}

export type DiscountTargetSelection = {
  __typename?: 'DiscountTargetSelection';
  role: DiscountTargetRole;
  targetType: DiscountTargetType;
  targets: Array<DiscountTarget>;
};

export type DiscountTargetSelectionInput = {
  role: DiscountTargetRole;
  /** Must be empty for ALL_PRODUCTS and non-empty for specific target types. */
  targetIds: Array<Scalars['ID']['input']>;
  targetType: DiscountTargetType;
};

export enum DiscountTargetType {
  AllProducts = 'ALL_PRODUCTS',
  Categories = 'CATEGORIES',
  Products = 'PRODUCTS',
  Variants = 'VARIANTS'
}

/** Discount-level sections executed by the unified discountUpdate workflow. */
export type DiscountUpdateInput = {
  /** Complete channel replacement when supplied. Empty removes every channel. */
  channels?: InputMaybe<Array<DiscountChannelInput>>;
  codes?: InputMaybe<DiscountCodesUpdateInput>;
  /** Complete compatible-class replacement when supplied. */
  combinesWith?: InputMaybe<Array<DiscountClass>>;
  definition?: InputMaybe<DiscountDefinitionUpdateInput>;
  eligibility?: InputMaybe<DiscountBuyerContextInput>;
  lifecycle?: InputMaybe<DiscountLifecycleUpdateInput>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  minimumRequirement?: InputMaybe<DiscountMinimumRequirementSyncInput>;
  rule?: InputMaybe<DiscountRuleInput>;
  /** Complete tag replacement when supplied. Empty removes every tag. */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Complete qualifier/benefit target replacement when supplied. */
  targetSelections?: InputMaybe<Array<DiscountTargetSelectionInput>>;
};

export type DiscountUpdatePayload = {
  __typename?: 'DiscountUpdatePayload';
  discount: Maybe<Discount>;
  operationResults: Array<DiscountOperationResult>;
  userErrors: Array<GenericUserError>;
};

export type DiscountUsageLimitsInput = {
  appliesOncePerCustomer: Scalars['Boolean']['input'];
  usageLimit?: InputMaybe<Scalars['BigInt']['input']>;
};

/** Operational capacity reservation retained as an audit record after closing. */
export type DiscountUsageReservation = Node & {
  __typename?: 'DiscountUsageReservation';
  checkoutId: Scalars['ID']['output'];
  closedAt: Maybe<Scalars['DateTime']['output']>;
  committedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: Maybe<Customer>;
  customerId: Maybe<Scalars['ID']['output']>;
  discount: Discount;
  discountCode: Maybe<DiscountCode>;
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  metadata: Scalars['JSON']['output'];
  status: DiscountReservationStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type DiscountUsageReservationConnection = {
  __typename?: 'DiscountUsageReservationConnection';
  edges: Array<DiscountUsageReservationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type DiscountUsageReservationEdge = {
  __typename?: 'DiscountUsageReservationEdge';
  cursor: Scalars['String']['output'];
  node: DiscountUsageReservation;
};

export type DiscountUsageReservationOrderByInput = {
  direction: SortDirection;
  field: DiscountUsageReservationOrderField;
};

export enum DiscountUsageReservationOrderField {
  ClosedAt = 'closedAt',
  CommittedAt = 'committedAt',
  CreatedAt = 'createdAt',
  ExpiresAt = 'expiresAt',
  Id = 'id',
  Status = 'status',
  UpdatedAt = 'updatedAt'
}

export type DiscountUsageReservationWhereInput = {
  _and?: InputMaybe<Array<DiscountUsageReservationWhereInput>>;
  _not?: InputMaybe<DiscountUsageReservationWhereInput>;
  _or?: InputMaybe<Array<DiscountUsageReservationWhereInput>>;
  checkoutId?: InputMaybe<IdFilter>;
  closedAt?: InputMaybe<DateTimeFilter>;
  codeId?: InputMaybe<IdFilter>;
  committedAt?: InputMaybe<DateTimeFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  customerId?: InputMaybe<IdFilter>;
  discountId?: InputMaybe<IdFilter>;
  expiresAt?: InputMaybe<DateTimeFilter>;
  id?: InputMaybe<IdFilter>;
  status?: InputMaybe<DiscountReservationStatusFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Aggregate usage accounting including active checkout reservations. */
export type DiscountUsageSummary = {
  __typename?: 'DiscountUsageSummary';
  committedCount: Scalars['BigInt']['output'];
  consumedCount: Scalars['BigInt']['output'];
  netCommittedCount: Scalars['BigInt']['output'];
  remainingCount: Maybe<Scalars['BigInt']['output']>;
  reservedCount: Scalars['BigInt']['output'];
  reversedCount: Scalars['BigInt']['output'];
  updatedAt: Maybe<Scalars['DateTime']['output']>;
  usageLimit: Maybe<Scalars['BigInt']['output']>;
  version: Maybe<Scalars['BigInt']['output']>;
};

export enum DiscountValueType {
  FixedAmount = 'FIXED_AMOUNT',
  Free = 'FREE',
  Percentage = 'PERCENTAGE'
}

/** Filters backed by pricing.discount_list_view and store-scoped relations. */
export type DiscountWhereInput = {
  _and?: InputMaybe<Array<DiscountWhereInput>>;
  _not?: InputMaybe<DiscountWhereInput>;
  _or?: InputMaybe<Array<DiscountWhereInput>>;
  appliesOnOneTimePurchase?: InputMaybe<BooleanFilter>;
  appliesOnSubscription?: InputMaybe<BooleanFilter>;
  appliesOncePerCustomer?: InputMaybe<BooleanFilter>;
  archivedAt?: InputMaybe<DateTimeFilter>;
  /** Match discounts available on a channel code. */
  channelCode?: InputMaybe<StringFilter>;
  /** Match any code assigned to the discount, including disabled codes. */
  code?: InputMaybe<StringFilter>;
  combinesWithOrderDiscounts?: InputMaybe<BooleanFilter>;
  combinesWithProductDiscounts?: InputMaybe<BooleanFilter>;
  combinesWithShippingDiscounts?: InputMaybe<BooleanFilter>;
  createdAt?: InputMaybe<DateTimeFilter>;
  createdById?: InputMaybe<StringFilter>;
  currency?: InputMaybe<DiscountCurrencyFilter>;
  discountClass?: InputMaybe<DiscountClassFilter>;
  effectiveStatus?: InputMaybe<DiscountEffectiveStatusFilter>;
  endsAt?: InputMaybe<DateTimeFilter>;
  /** Match discounts featured on a channel code. */
  featuredChannelCode?: InputMaybe<StringFilter>;
  id?: InputMaybe<IdFilter>;
  kind?: InputMaybe<DiscountKindFilter>;
  method?: InputMaybe<DiscountMethodFilter>;
  primaryCode?: InputMaybe<StringFilter>;
  priority?: InputMaybe<IntFilter>;
  reservedUsageCount?: InputMaybe<BigIntFilter>;
  revision?: InputMaybe<IntFilter>;
  startsAt?: InputMaybe<DateTimeFilter>;
  state?: InputMaybe<DiscountStateFilter>;
  /** Match discounts assigned to at least one normalized tag. */
  tag?: InputMaybe<StringFilter>;
  title?: InputMaybe<StringFilter>;
  updatedAt?: InputMaybe<DateTimeFilter>;
  usageCount?: InputMaybe<BigIntFilter>;
  usageLimit?: InputMaybe<BigIntFilter>;
};

export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export type IdFilter = {
  _eq?: InputMaybe<Scalars['ID']['input']>;
  _in?: InputMaybe<Array<Scalars['ID']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['ID']['input']>;
  _notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type IntFilter = {
  _between?: InputMaybe<Array<Scalars['Int']['input']>>;
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
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
  /** Pricing Admin mutation namespace. */
  pricingMutation: PricingMutation;
};

/** The Node interface is implemented by globally identifiable entities. */
export type Node = {
  id: Scalars['ID']['output'];
};

/** Relay pagination metadata. */
export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['String']['output']>;
};

/** Store-scoped pricing commands. */
export type PricingMutation = {
  __typename?: 'PricingMutation';
  discountCreate: DiscountCreatePayload;
  /**
   * Permanently delete an unused draft. Active, historical, or redeemed discounts
   * must be archived through discountUpdate instead.
   */
  discountDelete: DiscountDeletePayload;
  discountExternalReferenceCreate: DiscountExternalReferenceCreatePayload;
  discountExternalReferenceDelete: DiscountExternalReferenceDeletePayload;
  discountExternalReferenceUpdate: DiscountExternalReferenceUpdatePayload;
  /** Unified discount configuration update with optimistic locking. */
  discountUpdate: DiscountUpdatePayload;
};


/** Store-scoped pricing commands. */
export type PricingMutationDiscountCreateArgs = {
  input: DiscountCreateInput;
};


/** Store-scoped pricing commands. */
export type PricingMutationDiscountDeleteArgs = {
  input: DiscountDeleteInput;
};


/** Store-scoped pricing commands. */
export type PricingMutationDiscountExternalReferenceCreateArgs = {
  input: DiscountExternalReferenceCreateInput;
};


/** Store-scoped pricing commands. */
export type PricingMutationDiscountExternalReferenceDeleteArgs = {
  input: DiscountExternalReferenceDeleteInput;
};


/** Store-scoped pricing commands. */
export type PricingMutationDiscountExternalReferenceUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  externalReferenceId: Scalars['ID']['input'];
  operations: DiscountExternalReferenceUpdateInput;
};


/** Store-scoped pricing commands. */
export type PricingMutationDiscountUpdateArgs = {
  discountId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations: DiscountUpdateInput;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQuery = {
  __typename?: 'PricingQuery';
  discount: Maybe<Discount>;
  discountCode: Maybe<DiscountCode>;
  discountCodes: DiscountCodeConnection;
  discountExternalReference: Maybe<DiscountExternalReference>;
  discountExternalReferences: DiscountExternalReferenceConnection;
  discountRedemption: Maybe<DiscountRedemption>;
  discountRedemptionAllocation: Maybe<DiscountRedemptionAllocation>;
  discountRedemptions: DiscountRedemptionConnection;
  discountUsageReservation: Maybe<DiscountUsageReservation>;
  discountUsageReservations: DiscountUsageReservationConnection;
  discounts: DiscountConnection;
  /** Resolve a Pricing-owned Relay node by global ID. */
  node: Maybe<Node>;
  /** Resolve Pricing-owned Relay nodes while preserving input order. */
  nodes: Array<Maybe<Node>>;
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountCodeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountCodesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountCodeOrderByInput>>;
  where?: InputMaybe<DiscountCodeWhereInput>;
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountExternalReferenceArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountExternalReferenceOrderByInput>>;
  where?: InputMaybe<DiscountExternalReferenceWhereInput>;
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountRedemptionArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountRedemptionAllocationArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountRedemptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountRedemptionOrderByInput>>;
  where?: InputMaybe<DiscountRedemptionWhereInput>;
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountUsageReservationArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountUsageReservationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountUsageReservationOrderByInput>>;
  where?: InputMaybe<DiscountUsageReservationWhereInput>;
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryDiscountsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<DiscountOrderByInput>>;
  where?: InputMaybe<DiscountWhereInput>;
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type PricingQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type Product = Node & {
  __typename?: 'Product';
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Pricing Admin query namespace. */
  pricingQuery: PricingQuery;
};

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type StringFilter = {
  _contains?: InputMaybe<Scalars['String']['input']>;
  _containsi?: InputMaybe<Scalars['String']['input']>;
  _endsWith?: InputMaybe<Scalars['String']['input']>;
  _endsWithi?: InputMaybe<Scalars['String']['input']>;
  _eq?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  _notContains?: InputMaybe<Scalars['String']['input']>;
  _notContainsi?: InputMaybe<Scalars['String']['input']>;
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  _startsWithi?: InputMaybe<Scalars['String']['input']>;
};

/** A user-facing mutation error. */
export type UserError = {
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export type Variant = Node & {
  __typename?: 'Variant';
  id: Scalars['ID']['output'];
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

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  DiscountCatalogTarget: ( Category ) | ( Product ) | ( Variant );
  DiscountRule: ( DiscountAmountOffRule ) | ( DiscountBuyXGetYRule ) | ( DiscountFreeShippingRule );
}>;
/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( Category ) | ( Customer ) | ( Omit<Discount, 'codes' | 'combinations' | 'rule' | 'targetSelections'> & { codes: _RefType['DiscountCodeConnection'], combinations: Array<_RefType['DiscountCombination']>, rule?: Maybe<_RefType['DiscountRule']>, targetSelections: Array<_RefType['DiscountTargetSelection']> } ) | ( Omit<DiscountCode, 'discount'> & { discount: _RefType['Discount'] } ) | ( Omit<DiscountExternalReference, 'discount'> & { discount: _RefType['Discount'] } ) | ( Omit<DiscountRedemption, 'discount' | 'discountCode'> & { discount: _RefType['Discount'], discountCode?: Maybe<_RefType['DiscountCode']> } ) | ( DiscountRedemptionAllocation ) | ( Omit<DiscountUsageReservation, 'discount' | 'discountCode'> & { discount: _RefType['Discount'], discountCode?: Maybe<_RefType['DiscountCode']> } ) | ( Product ) | ( Variant );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BigIntFilter: BigIntFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BooleanFilter: BooleanFilter;
  Category: ResolverTypeWrapper<Category>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CurrencyCode: CurrencyCode;
  Customer: ResolverTypeWrapper<Customer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  Discount: ResolverTypeWrapper<Omit<Discount, 'codes' | 'combinations' | 'rule' | 'targetSelections'> & { codes: ResolversTypes['DiscountCodeConnection'], combinations: Array<ResolversTypes['DiscountCombination']>, rule?: Maybe<ResolversTypes['DiscountRule']>, targetSelections: Array<ResolversTypes['DiscountTargetSelection']> }>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  DiscountAllocationMethod: DiscountAllocationMethod;
  DiscountAllocationTargetType: DiscountAllocationTargetType;
  DiscountAmountOffRule: ResolverTypeWrapper<DiscountAmountOffRule>;
  DiscountAmountOffRuleInput: DiscountAmountOffRuleInput;
  DiscountBuyXGetYRule: ResolverTypeWrapper<DiscountBuyXGetYRule>;
  DiscountBuyXGetYRuleInput: DiscountBuyXGetYRuleInput;
  DiscountBuyerContext: ResolverTypeWrapper<DiscountBuyerContext>;
  DiscountBuyerContextInput: DiscountBuyerContextInput;
  DiscountBuyerContextType: DiscountBuyerContextType;
  DiscountCatalogTarget: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['DiscountCatalogTarget']>;
  DiscountChannel: ResolverTypeWrapper<DiscountChannel>;
  DiscountChannelInput: DiscountChannelInput;
  DiscountClass: DiscountClass;
  DiscountClassFilter: DiscountClassFilter;
  DiscountCode: ResolverTypeWrapper<Omit<DiscountCode, 'discount'> & { discount: ResolversTypes['Discount'] }>;
  DiscountCodeConnection: ResolverTypeWrapper<Omit<DiscountCodeConnection, 'edges'> & { edges: Array<ResolversTypes['DiscountCodeEdge']> }>;
  DiscountCodeCreateOperationInput: DiscountCodeCreateOperationInput;
  DiscountCodeDeleteOperationInput: DiscountCodeDeleteOperationInput;
  DiscountCodeEdge: ResolverTypeWrapper<Omit<DiscountCodeEdge, 'node'> & { node: ResolversTypes['DiscountCode'] }>;
  DiscountCodeOrderByInput: DiscountCodeOrderByInput;
  DiscountCodeOrderField: DiscountCodeOrderField;
  DiscountCodeStatus: DiscountCodeStatus;
  DiscountCodeStatusFilter: DiscountCodeStatusFilter;
  DiscountCodeUpdateOperationInput: DiscountCodeUpdateOperationInput;
  DiscountCodeWhereInput: DiscountCodeWhereInput;
  DiscountCodesUpdateInput: DiscountCodesUpdateInput;
  DiscountCombination: ResolverTypeWrapper<DiscountCombination>;
  DiscountConnection: ResolverTypeWrapper<Omit<DiscountConnection, 'edges'> & { edges: Array<ResolversTypes['DiscountEdge']> }>;
  DiscountCreateInput: DiscountCreateInput;
  DiscountCreatePayload: ResolverTypeWrapper<Omit<DiscountCreatePayload, 'discount'> & { discount?: Maybe<ResolversTypes['Discount']> }>;
  DiscountCurrencyFilter: DiscountCurrencyFilter;
  DiscountDefinitionUpdateInput: DiscountDefinitionUpdateInput;
  DiscountDeleteInput: DiscountDeleteInput;
  DiscountDeletePayload: ResolverTypeWrapper<DiscountDeletePayload>;
  DiscountEdge: ResolverTypeWrapper<Omit<DiscountEdge, 'node'> & { node: ResolversTypes['Discount'] }>;
  DiscountEffectiveStatus: DiscountEffectiveStatus;
  DiscountEffectiveStatusFilter: DiscountEffectiveStatusFilter;
  DiscountEligibleCustomer: ResolverTypeWrapper<DiscountEligibleCustomer>;
  DiscountEligibleSegment: ResolverTypeWrapper<DiscountEligibleSegment>;
  DiscountExternalReference: ResolverTypeWrapper<Omit<DiscountExternalReference, 'discount'> & { discount: ResolversTypes['Discount'] }>;
  DiscountExternalReferenceConnection: ResolverTypeWrapper<DiscountExternalReferenceConnection>;
  DiscountExternalReferenceCreateInput: DiscountExternalReferenceCreateInput;
  DiscountExternalReferenceCreatePayload: ResolverTypeWrapper<DiscountExternalReferenceCreatePayload>;
  DiscountExternalReferenceDeleteInput: DiscountExternalReferenceDeleteInput;
  DiscountExternalReferenceDeletePayload: ResolverTypeWrapper<DiscountExternalReferenceDeletePayload>;
  DiscountExternalReferenceEdge: ResolverTypeWrapper<DiscountExternalReferenceEdge>;
  DiscountExternalReferenceIdentityInput: DiscountExternalReferenceIdentityInput;
  DiscountExternalReferenceOrderByInput: DiscountExternalReferenceOrderByInput;
  DiscountExternalReferenceOrderField: DiscountExternalReferenceOrderField;
  DiscountExternalReferenceSyncInput: DiscountExternalReferenceSyncInput;
  DiscountExternalReferenceUpdateInput: DiscountExternalReferenceUpdateInput;
  DiscountExternalReferenceUpdatePayload: ResolverTypeWrapper<DiscountExternalReferenceUpdatePayload>;
  DiscountExternalReferenceWhereInput: DiscountExternalReferenceWhereInput;
  DiscountExternalSyncDirection: DiscountExternalSyncDirection;
  DiscountExternalSyncDirectionFilter: DiscountExternalSyncDirectionFilter;
  DiscountExternalSyncStatus: DiscountExternalSyncStatus;
  DiscountExternalSyncStatusFilter: DiscountExternalSyncStatusFilter;
  DiscountFreeShippingRule: ResolverTypeWrapper<DiscountFreeShippingRule>;
  DiscountFreeShippingRuleInput: DiscountFreeShippingRuleInput;
  DiscountKind: DiscountKind;
  DiscountKindFilter: DiscountKindFilter;
  DiscountLifecycleUpdateInput: DiscountLifecycleUpdateInput;
  DiscountMethod: DiscountMethod;
  DiscountMethodFilter: DiscountMethodFilter;
  DiscountMinimumRequirement: ResolverTypeWrapper<DiscountMinimumRequirement>;
  DiscountMinimumRequirementInput: DiscountMinimumRequirementInput;
  DiscountMinimumRequirementSyncInput: DiscountMinimumRequirementSyncInput;
  DiscountOperationResult: ResolverTypeWrapper<DiscountOperationResult>;
  DiscountOperationType: DiscountOperationType;
  DiscountOrderByInput: DiscountOrderByInput;
  DiscountOrderField: DiscountOrderField;
  DiscountPurchaseModesInput: DiscountPurchaseModesInput;
  DiscountRedemption: ResolverTypeWrapper<Omit<DiscountRedemption, 'discount' | 'discountCode'> & { discount: ResolversTypes['Discount'], discountCode?: Maybe<ResolversTypes['DiscountCode']> }>;
  DiscountRedemptionAllocation: ResolverTypeWrapper<DiscountRedemptionAllocation>;
  DiscountRedemptionConnection: ResolverTypeWrapper<DiscountRedemptionConnection>;
  DiscountRedemptionEdge: ResolverTypeWrapper<DiscountRedemptionEdge>;
  DiscountRedemptionOrderByInput: DiscountRedemptionOrderByInput;
  DiscountRedemptionOrderField: DiscountRedemptionOrderField;
  DiscountRedemptionStatus: DiscountRedemptionStatus;
  DiscountRedemptionStatusFilter: DiscountRedemptionStatusFilter;
  DiscountRedemptionWhereInput: DiscountRedemptionWhereInput;
  DiscountReferenceStatus: DiscountReferenceStatus;
  DiscountRequirementType: DiscountRequirementType;
  DiscountReservationStatus: DiscountReservationStatus;
  DiscountReservationStatusFilter: DiscountReservationStatusFilter;
  DiscountRule: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['DiscountRule']>;
  DiscountRuleInput: DiscountRuleInput;
  DiscountScheduleInput: DiscountScheduleInput;
  DiscountState: DiscountState;
  DiscountStateFilter: DiscountStateFilter;
  DiscountTarget: ResolverTypeWrapper<Omit<DiscountTarget, 'target'> & { target?: Maybe<ResolversTypes['DiscountCatalogTarget']> }>;
  DiscountTargetRole: DiscountTargetRole;
  DiscountTargetSelection: ResolverTypeWrapper<Omit<DiscountTargetSelection, 'targets'> & { targets: Array<ResolversTypes['DiscountTarget']> }>;
  DiscountTargetSelectionInput: DiscountTargetSelectionInput;
  DiscountTargetType: DiscountTargetType;
  DiscountUpdateInput: DiscountUpdateInput;
  DiscountUpdatePayload: ResolverTypeWrapper<Omit<DiscountUpdatePayload, 'discount'> & { discount?: Maybe<ResolversTypes['Discount']> }>;
  DiscountUsageLimitsInput: DiscountUsageLimitsInput;
  DiscountUsageReservation: ResolverTypeWrapper<Omit<DiscountUsageReservation, 'discount' | 'discountCode'> & { discount: ResolversTypes['Discount'], discountCode?: Maybe<ResolversTypes['DiscountCode']> }>;
  DiscountUsageReservationConnection: ResolverTypeWrapper<DiscountUsageReservationConnection>;
  DiscountUsageReservationEdge: ResolverTypeWrapper<DiscountUsageReservationEdge>;
  DiscountUsageReservationOrderByInput: DiscountUsageReservationOrderByInput;
  DiscountUsageReservationOrderField: DiscountUsageReservationOrderField;
  DiscountUsageReservationWhereInput: DiscountUsageReservationWhereInput;
  DiscountUsageSummary: ResolverTypeWrapper<DiscountUsageSummary>;
  DiscountValueType: DiscountValueType;
  DiscountWhereInput: DiscountWhereInput;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PricingMutation: ResolverTypeWrapper<Omit<PricingMutation, 'discountCreate' | 'discountUpdate'> & { discountCreate: ResolversTypes['DiscountCreatePayload'], discountUpdate: ResolversTypes['DiscountUpdatePayload'] }>;
  PricingQuery: ResolverTypeWrapper<Omit<PricingQuery, 'discount' | 'discountCode' | 'discountCodes' | 'discounts' | 'node' | 'nodes'> & { discount?: Maybe<ResolversTypes['Discount']>, discountCode?: Maybe<ResolversTypes['DiscountCode']>, discountCodes: ResolversTypes['DiscountCodeConnection'], discounts: ResolversTypes['DiscountConnection'], node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  Product: ResolverTypeWrapper<Product>;
  Query: ResolverTypeWrapper<{}>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  Variant: ResolverTypeWrapper<Variant>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BigIntFilter: BigIntFilter;
  Boolean: Scalars['Boolean']['output'];
  BooleanFilter: BooleanFilter;
  Category: Category;
  ID: Scalars['ID']['output'];
  Customer: Customer;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Discount: Omit<Discount, 'codes' | 'combinations' | 'rule' | 'targetSelections'> & { codes: ResolversParentTypes['DiscountCodeConnection'], combinations: Array<ResolversParentTypes['DiscountCombination']>, rule?: Maybe<ResolversParentTypes['DiscountRule']>, targetSelections: Array<ResolversParentTypes['DiscountTargetSelection']> };
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  DiscountAmountOffRule: DiscountAmountOffRule;
  DiscountAmountOffRuleInput: DiscountAmountOffRuleInput;
  DiscountBuyXGetYRule: DiscountBuyXGetYRule;
  DiscountBuyXGetYRuleInput: DiscountBuyXGetYRuleInput;
  DiscountBuyerContext: DiscountBuyerContext;
  DiscountBuyerContextInput: DiscountBuyerContextInput;
  DiscountCatalogTarget: ResolversUnionTypes<ResolversParentTypes>['DiscountCatalogTarget'];
  DiscountChannel: DiscountChannel;
  DiscountChannelInput: DiscountChannelInput;
  DiscountClassFilter: DiscountClassFilter;
  DiscountCode: Omit<DiscountCode, 'discount'> & { discount: ResolversParentTypes['Discount'] };
  DiscountCodeConnection: Omit<DiscountCodeConnection, 'edges'> & { edges: Array<ResolversParentTypes['DiscountCodeEdge']> };
  DiscountCodeCreateOperationInput: DiscountCodeCreateOperationInput;
  DiscountCodeDeleteOperationInput: DiscountCodeDeleteOperationInput;
  DiscountCodeEdge: Omit<DiscountCodeEdge, 'node'> & { node: ResolversParentTypes['DiscountCode'] };
  DiscountCodeOrderByInput: DiscountCodeOrderByInput;
  DiscountCodeStatusFilter: DiscountCodeStatusFilter;
  DiscountCodeUpdateOperationInput: DiscountCodeUpdateOperationInput;
  DiscountCodeWhereInput: DiscountCodeWhereInput;
  DiscountCodesUpdateInput: DiscountCodesUpdateInput;
  DiscountCombination: DiscountCombination;
  DiscountConnection: Omit<DiscountConnection, 'edges'> & { edges: Array<ResolversParentTypes['DiscountEdge']> };
  DiscountCreateInput: DiscountCreateInput;
  DiscountCreatePayload: Omit<DiscountCreatePayload, 'discount'> & { discount?: Maybe<ResolversParentTypes['Discount']> };
  DiscountCurrencyFilter: DiscountCurrencyFilter;
  DiscountDefinitionUpdateInput: DiscountDefinitionUpdateInput;
  DiscountDeleteInput: DiscountDeleteInput;
  DiscountDeletePayload: DiscountDeletePayload;
  DiscountEdge: Omit<DiscountEdge, 'node'> & { node: ResolversParentTypes['Discount'] };
  DiscountEffectiveStatusFilter: DiscountEffectiveStatusFilter;
  DiscountEligibleCustomer: DiscountEligibleCustomer;
  DiscountEligibleSegment: DiscountEligibleSegment;
  DiscountExternalReference: Omit<DiscountExternalReference, 'discount'> & { discount: ResolversParentTypes['Discount'] };
  DiscountExternalReferenceConnection: DiscountExternalReferenceConnection;
  DiscountExternalReferenceCreateInput: DiscountExternalReferenceCreateInput;
  DiscountExternalReferenceCreatePayload: DiscountExternalReferenceCreatePayload;
  DiscountExternalReferenceDeleteInput: DiscountExternalReferenceDeleteInput;
  DiscountExternalReferenceDeletePayload: DiscountExternalReferenceDeletePayload;
  DiscountExternalReferenceEdge: DiscountExternalReferenceEdge;
  DiscountExternalReferenceIdentityInput: DiscountExternalReferenceIdentityInput;
  DiscountExternalReferenceOrderByInput: DiscountExternalReferenceOrderByInput;
  DiscountExternalReferenceSyncInput: DiscountExternalReferenceSyncInput;
  DiscountExternalReferenceUpdateInput: DiscountExternalReferenceUpdateInput;
  DiscountExternalReferenceUpdatePayload: DiscountExternalReferenceUpdatePayload;
  DiscountExternalReferenceWhereInput: DiscountExternalReferenceWhereInput;
  DiscountExternalSyncDirectionFilter: DiscountExternalSyncDirectionFilter;
  DiscountExternalSyncStatusFilter: DiscountExternalSyncStatusFilter;
  DiscountFreeShippingRule: DiscountFreeShippingRule;
  DiscountFreeShippingRuleInput: DiscountFreeShippingRuleInput;
  DiscountKindFilter: DiscountKindFilter;
  DiscountLifecycleUpdateInput: DiscountLifecycleUpdateInput;
  DiscountMethodFilter: DiscountMethodFilter;
  DiscountMinimumRequirement: DiscountMinimumRequirement;
  DiscountMinimumRequirementInput: DiscountMinimumRequirementInput;
  DiscountMinimumRequirementSyncInput: DiscountMinimumRequirementSyncInput;
  DiscountOperationResult: DiscountOperationResult;
  DiscountOrderByInput: DiscountOrderByInput;
  DiscountPurchaseModesInput: DiscountPurchaseModesInput;
  DiscountRedemption: Omit<DiscountRedemption, 'discount' | 'discountCode'> & { discount: ResolversParentTypes['Discount'], discountCode?: Maybe<ResolversParentTypes['DiscountCode']> };
  DiscountRedemptionAllocation: DiscountRedemptionAllocation;
  DiscountRedemptionConnection: DiscountRedemptionConnection;
  DiscountRedemptionEdge: DiscountRedemptionEdge;
  DiscountRedemptionOrderByInput: DiscountRedemptionOrderByInput;
  DiscountRedemptionStatusFilter: DiscountRedemptionStatusFilter;
  DiscountRedemptionWhereInput: DiscountRedemptionWhereInput;
  DiscountReservationStatusFilter: DiscountReservationStatusFilter;
  DiscountRule: ResolversUnionTypes<ResolversParentTypes>['DiscountRule'];
  DiscountRuleInput: DiscountRuleInput;
  DiscountScheduleInput: DiscountScheduleInput;
  DiscountStateFilter: DiscountStateFilter;
  DiscountTarget: Omit<DiscountTarget, 'target'> & { target?: Maybe<ResolversParentTypes['DiscountCatalogTarget']> };
  DiscountTargetSelection: Omit<DiscountTargetSelection, 'targets'> & { targets: Array<ResolversParentTypes['DiscountTarget']> };
  DiscountTargetSelectionInput: DiscountTargetSelectionInput;
  DiscountUpdateInput: DiscountUpdateInput;
  DiscountUpdatePayload: Omit<DiscountUpdatePayload, 'discount'> & { discount?: Maybe<ResolversParentTypes['Discount']> };
  DiscountUsageLimitsInput: DiscountUsageLimitsInput;
  DiscountUsageReservation: Omit<DiscountUsageReservation, 'discount' | 'discountCode'> & { discount: ResolversParentTypes['Discount'], discountCode?: Maybe<ResolversParentTypes['DiscountCode']> };
  DiscountUsageReservationConnection: DiscountUsageReservationConnection;
  DiscountUsageReservationEdge: DiscountUsageReservationEdge;
  DiscountUsageReservationOrderByInput: DiscountUsageReservationOrderByInput;
  DiscountUsageReservationWhereInput: DiscountUsageReservationWhereInput;
  DiscountUsageSummary: DiscountUsageSummary;
  DiscountWhereInput: DiscountWhereInput;
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  PricingMutation: Omit<PricingMutation, 'discountCreate' | 'discountUpdate'> & { discountCreate: ResolversParentTypes['DiscountCreatePayload'], discountUpdate: ResolversParentTypes['DiscountUpdatePayload'] };
  PricingQuery: Omit<PricingQuery, 'discount' | 'discountCode' | 'discountCodes' | 'discounts' | 'node' | 'nodes'> & { discount?: Maybe<ResolversParentTypes['Discount']>, discountCode?: Maybe<ResolversParentTypes['DiscountCode']>, discountCodes: ResolversParentTypes['DiscountCodeConnection'], discounts: ResolversParentTypes['DiscountConnection'], node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  Product: Product;
  Query: {};
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  Variant: Variant;
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type CategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DiscountResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Discount'] = ResolversParentTypes['Discount']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Discount']>, { __typename: 'Discount' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  appliesOnOneTimePurchase?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  appliesOnSubscription?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  appliesOncePerCustomer?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  archivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  buyerContext?: Resolver<ResolversTypes['DiscountBuyerContext'], ParentType, ContextType>;
  channelCodes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  channels?: Resolver<Array<ResolversTypes['DiscountChannel']>, ParentType, ContextType>;
  codes?: Resolver<ResolversTypes['DiscountCodeConnection'], ParentType, ContextType, Partial<DiscountCodesArgs>>;
  codesCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  combinations?: Resolver<Array<ResolversTypes['DiscountCombination']>, ParentType, ContextType>;
  combinesWithOrderDiscounts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  combinesWithProductDiscounts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  combinesWithShippingDiscounts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  discountClass?: Resolver<ResolversTypes['DiscountClass'], ParentType, ContextType>;
  effectiveStatus?: Resolver<ResolversTypes['DiscountEffectiveStatus'], ParentType, ContextType>;
  endsAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  externalReferences?: Resolver<ResolversTypes['DiscountExternalReferenceConnection'], ParentType, ContextType, Partial<DiscountExternalReferencesArgs>>;
  featuredChannelCodes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['DiscountKind'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  method?: Resolver<ResolversTypes['DiscountMethod'], ParentType, ContextType>;
  minimumRequirement?: Resolver<Maybe<ResolversTypes['DiscountMinimumRequirement']>, ParentType, ContextType>;
  primaryCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  redemptions?: Resolver<ResolversTypes['DiscountRedemptionConnection'], ParentType, ContextType, Partial<DiscountRedemptionsArgs>>;
  reservedUsageCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rule?: Resolver<Maybe<ResolversTypes['DiscountRule']>, ParentType, ContextType>;
  startsAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['DiscountState'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  targetSelections?: Resolver<Array<ResolversTypes['DiscountTargetSelection']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  usage?: Resolver<ResolversTypes['DiscountUsageSummary'], ParentType, ContextType>;
  usageCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  usageLimit?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  usageReservations?: Resolver<ResolversTypes['DiscountUsageReservationConnection'], ParentType, ContextType, Partial<DiscountUsageReservationsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountAmountOffRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountAmountOffRule'] = ResolversParentTypes['DiscountAmountOffRule']> = ResolversObject<{
  allocationMethod?: Resolver<ResolversTypes['DiscountAllocationMethod'], ParentType, ContextType>;
  amountMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  maximumDiscountMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  percentageBps?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  valueType?: Resolver<ResolversTypes['DiscountValueType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountBuyXGetYRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountBuyXGetYRule'] = ResolversParentTypes['DiscountBuyXGetYRule']> = ResolversObject<{
  benefitAmountMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  benefitPercentageBps?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  benefitQuantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  benefitValueType?: Resolver<ResolversTypes['DiscountValueType'], ParentType, ContextType>;
  requiredQuantity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  requiredSubtotalMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  requirementType?: Resolver<ResolversTypes['DiscountRequirementType'], ParentType, ContextType>;
  usesPerOrderLimit?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountBuyerContextResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountBuyerContext'] = ResolversParentTypes['DiscountBuyerContext']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customers?: Resolver<Array<ResolversTypes['DiscountEligibleCustomer']>, ParentType, ContextType>;
  segments?: Resolver<Array<ResolversTypes['DiscountEligibleSegment']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DiscountBuyerContextType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountCatalogTargetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountCatalogTarget'] = ResolversParentTypes['DiscountCatalogTarget']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Category' | 'Product' | 'Variant', ParentType, ContextType>;
}>;

export type DiscountChannelResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountChannel'] = ResolversParentTypes['DiscountChannel']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  featured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountCodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountCode'] = ResolversParentTypes['DiscountCode']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['DiscountCode']>, { __typename: 'DiscountCode' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  committedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  disabledAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  discount?: Resolver<ResolversTypes['Discount'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  normalizedCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remainingCount?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  reservedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  reversedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['DiscountCodeStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  usageCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  usageLimit?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountCodeConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountCodeConnection'] = ResolversParentTypes['DiscountCodeConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DiscountCodeEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountCodeEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountCodeEdge'] = ResolversParentTypes['DiscountCodeEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['DiscountCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountCombinationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountCombination'] = ResolversParentTypes['DiscountCombination']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  discountClass?: Resolver<ResolversTypes['DiscountClass'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountConnection'] = ResolversParentTypes['DiscountConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DiscountEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountCreatePayload'] = ResolversParentTypes['DiscountCreatePayload']> = ResolversObject<{
  discount?: Resolver<Maybe<ResolversTypes['Discount']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountDeletePayload'] = ResolversParentTypes['DiscountDeletePayload']> = ResolversObject<{
  deletedDiscountId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountEdge'] = ResolversParentTypes['DiscountEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Discount'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountEligibleCustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountEligibleCustomer'] = ResolversParentTypes['DiscountEligibleCustomer']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  customerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  referenceCheckedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  referenceStatus?: Resolver<ResolversTypes['DiscountReferenceStatus'], ParentType, ContextType>;
  referenceStatusChangedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountEligibleSegmentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountEligibleSegment'] = ResolversParentTypes['DiscountEligibleSegment']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  referenceCheckedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  referenceStatus?: Resolver<ResolversTypes['DiscountReferenceStatus'], ParentType, ContextType>;
  referenceStatusChangedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  segmentId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountExternalReferenceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountExternalReference'] = ResolversParentTypes['DiscountExternalReference']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['DiscountExternalReference']>, { __typename: 'DiscountExternalReference' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  contentChecksum?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['DiscountExternalSyncDirection'], ParentType, ContextType>;
  discount?: Resolver<ResolversTypes['Discount'], ParentType, ContextType>;
  etag?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  externalId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalSystem?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  externalUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastError?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastSyncedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  syncStatus?: Resolver<ResolversTypes['DiscountExternalSyncStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountExternalReferenceConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountExternalReferenceConnection'] = ResolversParentTypes['DiscountExternalReferenceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DiscountExternalReferenceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountExternalReferenceCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountExternalReferenceCreatePayload'] = ResolversParentTypes['DiscountExternalReferenceCreatePayload']> = ResolversObject<{
  externalReference?: Resolver<Maybe<ResolversTypes['DiscountExternalReference']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountExternalReferenceDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountExternalReferenceDeletePayload'] = ResolversParentTypes['DiscountExternalReferenceDeletePayload']> = ResolversObject<{
  deletedExternalReferenceId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountExternalReferenceEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountExternalReferenceEdge'] = ResolversParentTypes['DiscountExternalReferenceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['DiscountExternalReference'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountExternalReferenceUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountExternalReferenceUpdatePayload'] = ResolversParentTypes['DiscountExternalReferenceUpdatePayload']> = ResolversObject<{
  externalReference?: Resolver<Maybe<ResolversTypes['DiscountExternalReference']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['DiscountOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountFreeShippingRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountFreeShippingRule'] = ResolversParentTypes['DiscountFreeShippingRule']> = ResolversObject<{
  maximumShippingPriceMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountMinimumRequirementResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountMinimumRequirement'] = ResolversParentTypes['DiscountMinimumRequirement']> = ResolversObject<{
  quantity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  requirementType?: Resolver<ResolversTypes['DiscountRequirementType'], ParentType, ContextType>;
  subtotalMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountOperationResult'] = ResolversParentTypes['DiscountOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DiscountOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountRedemptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountRedemption'] = ResolversParentTypes['DiscountRedemption']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['DiscountRedemption']>, { __typename: 'DiscountRedemption' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  allocations?: Resolver<Array<ResolversTypes['DiscountRedemptionAllocation']>, ParentType, ContextType>;
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  checkoutId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  committedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  configurationRevision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  customerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  discount?: Resolver<ResolversTypes['Discount'], ParentType, ContextType>;
  discountClass?: Resolver<ResolversTypes['DiscountClass'], ParentType, ContextType>;
  discountCode?: Resolver<Maybe<ResolversTypes['DiscountCode']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  orderId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reservation?: Resolver<Maybe<ResolversTypes['DiscountUsageReservation']>, ParentType, ContextType>;
  reversalReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reversedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['DiscountRedemptionStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountRedemptionAllocationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountRedemptionAllocation'] = ResolversParentTypes['DiscountRedemptionAllocation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['DiscountRedemptionAllocation']>, { __typename: 'DiscountRedemptionAllocation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  redemption?: Resolver<ResolversTypes['DiscountRedemption'], ParentType, ContextType>;
  targetId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  targetType?: Resolver<ResolversTypes['DiscountAllocationTargetType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountRedemptionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountRedemptionConnection'] = ResolversParentTypes['DiscountRedemptionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DiscountRedemptionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountRedemptionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountRedemptionEdge'] = ResolversParentTypes['DiscountRedemptionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['DiscountRedemption'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountRule'] = ResolversParentTypes['DiscountRule']> = ResolversObject<{
  __resolveType: TypeResolveFn<'DiscountAmountOffRule' | 'DiscountBuyXGetYRule' | 'DiscountFreeShippingRule', ParentType, ContextType>;
}>;

export type DiscountTargetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountTarget'] = ResolversParentTypes['DiscountTarget']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  referenceCheckedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  referenceStatus?: Resolver<ResolversTypes['DiscountReferenceStatus'], ParentType, ContextType>;
  referenceStatusChangedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  target?: Resolver<Maybe<ResolversTypes['DiscountCatalogTarget']>, ParentType, ContextType>;
  targetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  targetType?: Resolver<ResolversTypes['DiscountTargetType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountTargetSelectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountTargetSelection'] = ResolversParentTypes['DiscountTargetSelection']> = ResolversObject<{
  role?: Resolver<ResolversTypes['DiscountTargetRole'], ParentType, ContextType>;
  targetType?: Resolver<ResolversTypes['DiscountTargetType'], ParentType, ContextType>;
  targets?: Resolver<Array<ResolversTypes['DiscountTarget']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountUpdatePayload'] = ResolversParentTypes['DiscountUpdatePayload']> = ResolversObject<{
  discount?: Resolver<Maybe<ResolversTypes['Discount']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['DiscountOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountUsageReservationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountUsageReservation'] = ResolversParentTypes['DiscountUsageReservation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['DiscountUsageReservation']>, { __typename: 'DiscountUsageReservation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  checkoutId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  closedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  committedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  customerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  discount?: Resolver<ResolversTypes['Discount'], ParentType, ContextType>;
  discountCode?: Resolver<Maybe<ResolversTypes['DiscountCode']>, ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['DiscountReservationStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountUsageReservationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountUsageReservationConnection'] = ResolversParentTypes['DiscountUsageReservationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['DiscountUsageReservationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountUsageReservationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountUsageReservationEdge'] = ResolversParentTypes['DiscountUsageReservationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['DiscountUsageReservation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DiscountUsageSummaryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DiscountUsageSummary'] = ResolversParentTypes['DiscountUsageSummary']> = ResolversObject<{
  committedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  consumedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  netCommittedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  remainingCount?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  reservedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  reversedCount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  usageLimit?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  pricingMutation?: Resolver<ResolversTypes['PricingMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Category' | 'Customer' | 'Discount' | 'DiscountCode' | 'DiscountExternalReference' | 'DiscountRedemption' | 'DiscountRedemptionAllocation' | 'DiscountUsageReservation' | 'Product' | 'Variant', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PricingMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PricingMutation'] = ResolversParentTypes['PricingMutation']> = ResolversObject<{
  discountCreate?: Resolver<ResolversTypes['DiscountCreatePayload'], ParentType, ContextType, RequireFields<PricingMutationDiscountCreateArgs, 'input'>>;
  discountDelete?: Resolver<ResolversTypes['DiscountDeletePayload'], ParentType, ContextType, RequireFields<PricingMutationDiscountDeleteArgs, 'input'>>;
  discountExternalReferenceCreate?: Resolver<ResolversTypes['DiscountExternalReferenceCreatePayload'], ParentType, ContextType, RequireFields<PricingMutationDiscountExternalReferenceCreateArgs, 'input'>>;
  discountExternalReferenceDelete?: Resolver<ResolversTypes['DiscountExternalReferenceDeletePayload'], ParentType, ContextType, RequireFields<PricingMutationDiscountExternalReferenceDeleteArgs, 'input'>>;
  discountExternalReferenceUpdate?: Resolver<ResolversTypes['DiscountExternalReferenceUpdatePayload'], ParentType, ContextType, RequireFields<PricingMutationDiscountExternalReferenceUpdateArgs, 'expectedUpdatedAt' | 'externalReferenceId' | 'operations'>>;
  discountUpdate?: Resolver<ResolversTypes['DiscountUpdatePayload'], ParentType, ContextType, RequireFields<PricingMutationDiscountUpdateArgs, 'discountId' | 'expectedRevision' | 'operations'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PricingQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PricingQuery'] = ResolversParentTypes['PricingQuery']> = ResolversObject<{
  discount?: Resolver<Maybe<ResolversTypes['Discount']>, ParentType, ContextType, RequireFields<PricingQueryDiscountArgs, 'id'>>;
  discountCode?: Resolver<Maybe<ResolversTypes['DiscountCode']>, ParentType, ContextType, RequireFields<PricingQueryDiscountCodeArgs, 'id'>>;
  discountCodes?: Resolver<ResolversTypes['DiscountCodeConnection'], ParentType, ContextType, Partial<PricingQueryDiscountCodesArgs>>;
  discountExternalReference?: Resolver<Maybe<ResolversTypes['DiscountExternalReference']>, ParentType, ContextType, RequireFields<PricingQueryDiscountExternalReferenceArgs, 'id'>>;
  discountExternalReferences?: Resolver<ResolversTypes['DiscountExternalReferenceConnection'], ParentType, ContextType, Partial<PricingQueryDiscountExternalReferencesArgs>>;
  discountRedemption?: Resolver<Maybe<ResolversTypes['DiscountRedemption']>, ParentType, ContextType, RequireFields<PricingQueryDiscountRedemptionArgs, 'id'>>;
  discountRedemptionAllocation?: Resolver<Maybe<ResolversTypes['DiscountRedemptionAllocation']>, ParentType, ContextType, RequireFields<PricingQueryDiscountRedemptionAllocationArgs, 'id'>>;
  discountRedemptions?: Resolver<ResolversTypes['DiscountRedemptionConnection'], ParentType, ContextType, Partial<PricingQueryDiscountRedemptionsArgs>>;
  discountUsageReservation?: Resolver<Maybe<ResolversTypes['DiscountUsageReservation']>, ParentType, ContextType, RequireFields<PricingQueryDiscountUsageReservationArgs, 'id'>>;
  discountUsageReservations?: Resolver<ResolversTypes['DiscountUsageReservationConnection'], ParentType, ContextType, Partial<PricingQueryDiscountUsageReservationsArgs>>;
  discounts?: Resolver<ResolversTypes['DiscountConnection'], ParentType, ContextType, Partial<PricingQueryDiscountsArgs>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<PricingQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<PricingQueryNodesArgs, 'ids'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  pricingQuery?: Resolver<ResolversTypes['PricingQuery'], ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Variant'] = ResolversParentTypes['Variant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  Category?: CategoryResolvers<ContextType>;
  Customer?: CustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Discount?: DiscountResolvers<ContextType>;
  DiscountAmountOffRule?: DiscountAmountOffRuleResolvers<ContextType>;
  DiscountBuyXGetYRule?: DiscountBuyXGetYRuleResolvers<ContextType>;
  DiscountBuyerContext?: DiscountBuyerContextResolvers<ContextType>;
  DiscountCatalogTarget?: DiscountCatalogTargetResolvers<ContextType>;
  DiscountChannel?: DiscountChannelResolvers<ContextType>;
  DiscountCode?: DiscountCodeResolvers<ContextType>;
  DiscountCodeConnection?: DiscountCodeConnectionResolvers<ContextType>;
  DiscountCodeEdge?: DiscountCodeEdgeResolvers<ContextType>;
  DiscountCombination?: DiscountCombinationResolvers<ContextType>;
  DiscountConnection?: DiscountConnectionResolvers<ContextType>;
  DiscountCreatePayload?: DiscountCreatePayloadResolvers<ContextType>;
  DiscountDeletePayload?: DiscountDeletePayloadResolvers<ContextType>;
  DiscountEdge?: DiscountEdgeResolvers<ContextType>;
  DiscountEligibleCustomer?: DiscountEligibleCustomerResolvers<ContextType>;
  DiscountEligibleSegment?: DiscountEligibleSegmentResolvers<ContextType>;
  DiscountExternalReference?: DiscountExternalReferenceResolvers<ContextType>;
  DiscountExternalReferenceConnection?: DiscountExternalReferenceConnectionResolvers<ContextType>;
  DiscountExternalReferenceCreatePayload?: DiscountExternalReferenceCreatePayloadResolvers<ContextType>;
  DiscountExternalReferenceDeletePayload?: DiscountExternalReferenceDeletePayloadResolvers<ContextType>;
  DiscountExternalReferenceEdge?: DiscountExternalReferenceEdgeResolvers<ContextType>;
  DiscountExternalReferenceUpdatePayload?: DiscountExternalReferenceUpdatePayloadResolvers<ContextType>;
  DiscountFreeShippingRule?: DiscountFreeShippingRuleResolvers<ContextType>;
  DiscountMinimumRequirement?: DiscountMinimumRequirementResolvers<ContextType>;
  DiscountOperationResult?: DiscountOperationResultResolvers<ContextType>;
  DiscountRedemption?: DiscountRedemptionResolvers<ContextType>;
  DiscountRedemptionAllocation?: DiscountRedemptionAllocationResolvers<ContextType>;
  DiscountRedemptionConnection?: DiscountRedemptionConnectionResolvers<ContextType>;
  DiscountRedemptionEdge?: DiscountRedemptionEdgeResolvers<ContextType>;
  DiscountRule?: DiscountRuleResolvers<ContextType>;
  DiscountTarget?: DiscountTargetResolvers<ContextType>;
  DiscountTargetSelection?: DiscountTargetSelectionResolvers<ContextType>;
  DiscountUpdatePayload?: DiscountUpdatePayloadResolvers<ContextType>;
  DiscountUsageReservation?: DiscountUsageReservationResolvers<ContextType>;
  DiscountUsageReservationConnection?: DiscountUsageReservationConnectionResolvers<ContextType>;
  DiscountUsageReservationEdge?: DiscountUsageReservationEdgeResolvers<ContextType>;
  DiscountUsageSummary?: DiscountUsageSummaryResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PricingMutation?: PricingMutationResolvers<ContextType>;
  PricingQuery?: PricingQueryResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  Variant?: VariantResolvers<ContextType>;
}>;
