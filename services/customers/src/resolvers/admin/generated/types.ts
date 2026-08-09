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
  /** Calendar date in ISO 8601 YYYY-MM-DD form. */
  Date: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
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

/** A store-scoped customer business profile owned by Customers. */
export type Customer = Node & {
  __typename?: 'Customer';
  accountStatus: CustomerAccountStatus;
  addresses: CustomerAddressConnection;
  /** Reason the customer is currently blocked. Null for other lifecycle states. */
  blockedReason: Maybe<Scalars['String']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  /** The customer's persisted product comparison selection. */
  comparison: Maybe<CustomerComparison>;
  /** At most one current consent record per channel. */
  consents: Array<CustomerConsent>;
  createdAt: Scalars['DateTime']['output'];
  createdByUserId: Maybe<Scalars['String']['output']>;
  dateOfBirth: Maybe<Scalars['Date']['output']>;
  defaultBillingAddress: Maybe<CustomerAddress>;
  defaultShippingAddress: Maybe<CustomerAddress>;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  displayName: Scalars['String']['output'];
  email: Maybe<Scalars['Email']['output']>;
  emailVerified: Scalars['Boolean']['output'];
  firstName: Maybe<Scalars['String']['output']>;
  gender: Maybe<Scalars['String']['output']>;
  groupMemberships: CustomerGroupMembershipConnection;
  /** Opaque IAM principal identifier. Null for guests and imported profiles. */
  iamPrincipalId: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  jobTitle: Maybe<Scalars['String']['output']>;
  lastActivityAt: Maybe<Scalars['DateTime']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  lifecycleStatus: CustomerLifecycleStatus;
  mergedInto: Maybe<Customer>;
  middleName: Maybe<Scalars['String']['output']>;
  /** Internal moderation context visible only to administrators. */
  moderationNote: Maybe<Scalars['String']['output']>;
  monetaryStatistics: CustomerMonetaryStatisticsConnection;
  note: Maybe<Scalars['String']['output']>;
  phoneE164: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  preferredLocale: Maybe<Scalars['String']['output']>;
  prefix: Maybe<Scalars['String']['output']>;
  redactedAt: Maybe<Scalars['DateTime']['output']>;
  revision: Scalars['Int']['output'];
  segmentMemberships: CustomerSegmentMembershipConnection;
  source: Scalars['String']['output'];
  statistics: Maybe<CustomerStatistics>;
  suffix: Maybe<Scalars['String']['output']>;
  tagAssignments: CustomerTagAssignmentConnection;
  taxExemptions: CustomerTaxExemptionConnection;
  taxIdentifiers: CustomerTaxIdentifierConnection;
  updatedAt: Scalars['DateTime']['output'];
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerAddressesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerAddressOrderByInput>>;
  where?: InputMaybe<CustomerAddressWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerGroupMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<CustomerGroupMembershipWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerMonetaryStatisticsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerMonetaryStatisticsOrderByInput>>;
  where?: InputMaybe<CustomerMonetaryStatisticsWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerSegmentMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<CustomerSegmentMembershipWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerTagAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<CustomerTagAssignmentWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerTaxExemptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTaxExemptionOrderByInput>>;
  where?: InputMaybe<CustomerTaxExemptionWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type CustomerTaxIdentifiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTaxIdentifierOrderByInput>>;
  where?: InputMaybe<CustomerTaxIdentifierWhereInput>;
};

export enum CustomerAccountStatus {
  Guest = 'GUEST',
  Invited = 'INVITED',
  Registered = 'REGISTERED'
}

export type CustomerAccountStatusFilter = {
  _eq?: InputMaybe<CustomerAccountStatus>;
  _in?: InputMaybe<Array<CustomerAccountStatus>>;
  _neq?: InputMaybe<CustomerAccountStatus>;
  _notIn?: InputMaybe<Array<CustomerAccountStatus>>;
};

export type CustomerAccountsSettings = {
  __typename?: 'CustomerAccountsSettings';
  methods: Array<CustomerAuthenticationMethodSettings>;
  providers: Array<CustomerAuthenticationProviderSettings>;
  realmEnabled: Scalars['Boolean']['output'];
  registrationMode: Scalars['String']['output'];
  revision: Scalars['Int']['output'];
};

export type CustomerAccountsSettingsUpdateInput = {
  enabledMethods: Array<CustomerAuthenticationMethod>;
  expectedRevision: Scalars['Int']['input'];
};

export type CustomerAccountsSettingsUpdatePayload = {
  __typename?: 'CustomerAccountsSettingsUpdatePayload';
  settings: Maybe<CustomerAccountsSettings>;
  userErrors: Array<GenericUserError>;
};

export type CustomerAddress = Node & {
  __typename?: 'CustomerAddress';
  address1: Scalars['String']['output'];
  address2: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  companyName: Maybe<Scalars['String']['output']>;
  /** Uppercase ISO 3166-1 alpha-2 code. */
  countryCode: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  firstName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isDefaultBilling: Scalars['Boolean']['output'];
  isDefaultShipping: Scalars['Boolean']['output'];
  label: Maybe<Scalars['String']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  latitude: Maybe<Scalars['Float']['output']>;
  longitude: Maybe<Scalars['Float']['output']>;
  middleName: Maybe<Scalars['String']['output']>;
  phoneE164: Maybe<Scalars['String']['output']>;
  postalCode: Maybe<Scalars['String']['output']>;
  prefix: Maybe<Scalars['String']['output']>;
  regionCode: Maybe<Scalars['String']['output']>;
  regionName: Maybe<Scalars['String']['output']>;
  suffix: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  validatedAt: Maybe<Scalars['DateTime']['output']>;
  validationStatus: CustomerAddressValidationStatus;
};

export type CustomerAddressConnection = {
  __typename?: 'CustomerAddressConnection';
  edges: Array<CustomerAddressEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Address values used inside the unified customerUpdate workflow. */
export type CustomerAddressCreateOperationInput = {
  address1: Scalars['String']['input'];
  address2?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode: Scalars['String']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  isDefaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  isDefaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  regionName?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerAddressEdge = {
  __typename?: 'CustomerAddressEdge';
  cursor: Scalars['String']['output'];
  node: CustomerAddress;
};

/** Ordering configuration for CustomerAddress */
export type CustomerAddressOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerAddressOrderField;
};

/** Fields available for sorting CustomerAddress */
export enum CustomerAddressOrderField {
  /** Sort by city */
  City = 'city',
  /** Sort by countryCode */
  CountryCode = 'countryCode',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by firstName */
  FirstName = 'firstName',
  /** Sort by id */
  Id = 'id',
  /** Sort by isDefaultBilling */
  IsDefaultBilling = 'isDefaultBilling',
  /** Sort by isDefaultShipping */
  IsDefaultShipping = 'isDefaultShipping',
  /** Sort by label */
  Label = 'label',
  /** Sort by lastName */
  LastName = 'lastName',
  /** Sort by postalCode */
  PostalCode = 'postalCode',
  /** Sort by regionCode */
  RegionCode = 'regionCode',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by validationStatus */
  ValidationStatus = 'validationStatus'
}

export type CustomerAddressPatchInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Set or clear this address as the customer's billing default. */
  isDefaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  /** Set or clear this address as the customer's shipping default. */
  isDefaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  regionName?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerAddressUpdateOperationInput = {
  addressId: Scalars['ID']['input'];
  operations: CustomerAddressPatchInput;
};

export enum CustomerAddressValidationStatus {
  Invalid = 'INVALID',
  Unvalidated = 'UNVALIDATED',
  Valid = 'VALID'
}

export type CustomerAddressValidationStatusFilter = {
  _eq?: InputMaybe<CustomerAddressValidationStatus>;
  _in?: InputMaybe<Array<CustomerAddressValidationStatus>>;
  _neq?: InputMaybe<CustomerAddressValidationStatus>;
  _notIn?: InputMaybe<Array<CustomerAddressValidationStatus>>;
};

/** Filter conditions for CustomerAddress */
export type CustomerAddressWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerAddressWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerAddressWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerAddressWhereInput>>;
  /** Filter by city */
  city?: InputMaybe<StringFilter>;
  /** Filter by companyName */
  companyName?: InputMaybe<StringFilter>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by firstName */
  firstName?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isDefaultBilling */
  isDefaultBilling?: InputMaybe<BooleanFilter>;
  /** Filter by isDefaultShipping */
  isDefaultShipping?: InputMaybe<BooleanFilter>;
  /** Filter by label */
  label?: InputMaybe<StringFilter>;
  /** Filter by lastName */
  lastName?: InputMaybe<StringFilter>;
  /** Filter by phoneE164 */
  phoneE164?: InputMaybe<StringFilter>;
  /** Filter by postalCode */
  postalCode?: InputMaybe<StringFilter>;
  /** Filter by regionCode */
  regionCode?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by validationStatus */
  validationStatus?: InputMaybe<CustomerAddressValidationStatusFilter>;
};

/** Batched address changes scoped to the customer being updated. */
export type CustomerAddressesUpdateInput = {
  create?: InputMaybe<Array<CustomerAddressCreateOperationInput>>;
  /** Existing address ID to make the default. Explicit null clears the default. */
  defaultBillingAddressId?: InputMaybe<Scalars['ID']['input']>;
  /** Existing address ID to make the default. Explicit null clears the default. */
  defaultShippingAddressId?: InputMaybe<Scalars['ID']['input']>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<CustomerAddressUpdateOperationInput>>;
};

/** Lifecycle states that a merchant administrator may select directly. */
export enum CustomerAdminLifecycleStatus {
  Active = 'ACTIVE',
  Blocked = 'BLOCKED',
  Disabled = 'DISABLED'
}

export enum CustomerAssignmentSource {
  Import = 'IMPORT',
  Manual = 'MANUAL',
  Rule = 'RULE',
  System = 'SYSTEM'
}

export type CustomerAssignmentSourceFilter = {
  _eq?: InputMaybe<CustomerAssignmentSource>;
  _in?: InputMaybe<Array<CustomerAssignmentSource>>;
  _neq?: InputMaybe<CustomerAssignmentSource>;
  _notIn?: InputMaybe<Array<CustomerAssignmentSource>>;
};

export enum CustomerAuthenticationMethod {
  EmailOtp = 'EMAIL_OTP',
  Password = 'PASSWORD',
  PhoneOtp = 'PHONE_OTP'
}

export type CustomerAuthenticationMethodSettings = {
  __typename?: 'CustomerAuthenticationMethodSettings';
  configured: Scalars['Boolean']['output'];
  enabled: Scalars['Boolean']['output'];
  method: CustomerAuthenticationMethod;
};

export enum CustomerAuthenticationProvider {
  Facebook = 'FACEBOOK',
  Google = 'GOOGLE'
}

export type CustomerAuthenticationProviderSettings = {
  __typename?: 'CustomerAuthenticationProviderSettings';
  configured: Scalars['Boolean']['output'];
  enabled: Scalars['Boolean']['output'];
  provider: CustomerAuthenticationProvider;
};

/** Company fields in the unified customer update. */
export type CustomerCompanyUpdateInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
};

/**
 * An authenticated customer's persisted product comparison selection.
 *
 * This Admin view is read-only. Product compatibility and the comparison matrix
 * remain owned and resolved by Catalog.
 */
export type CustomerComparison = Node & {
  __typename?: 'CustomerComparison';
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  id: Scalars['ID']['output'];
  items: Array<CustomerComparisonItem>;
  revision: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** One concrete Catalog variant stored as a comparison column. */
export type CustomerComparisonItem = Node & {
  __typename?: 'CustomerComparisonItem';
  addedAt: Scalars['DateTime']['output'];
  comparison: CustomerComparison;
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
  product: Maybe<Product>;
  productId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
  variant: Maybe<Variant>;
  variantId: Scalars['ID']['output'];
};

export type CustomerConnection = {
  __typename?: 'CustomerConnection';
  edges: Array<CustomerEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Current consent state for one customer and channel. */
export type CustomerConsent = Node & {
  __typename?: 'CustomerConsent';
  channel: CustomerConsentChannel;
  consentedAt: Maybe<Scalars['DateTime']['output']>;
  contactPoint: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  events: CustomerConsentEventConnection;
  id: Scalars['ID']['output'];
  optInLevel: CustomerConsentOptInLevel;
  source: Scalars['String']['output'];
  sourceIp: Maybe<Scalars['String']['output']>;
  sourceLocationId: Maybe<Scalars['ID']['output']>;
  state: CustomerConsentState;
  updatedAt: Scalars['DateTime']['output'];
  userAgent: Maybe<Scalars['String']['output']>;
  withdrawnAt: Maybe<Scalars['DateTime']['output']>;
};


/** Current consent state for one customer and channel. */
export type CustomerConsentEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerConsentEventOrderByInput>>;
};

/** Consent states that a merchant administrator may set explicitly. */
export enum CustomerConsentAdminState {
  NotSubscribed = 'NOT_SUBSCRIBED',
  Pending = 'PENDING',
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export enum CustomerConsentChannel {
  Email = 'EMAIL',
  Push = 'PUSH',
  Sms = 'SMS',
  Whatsapp = 'WHATSAPP'
}

/** Immutable evidence record for a consent transition. */
export type CustomerConsentEvent = Node & {
  __typename?: 'CustomerConsentEvent';
  actorId: Maybe<Scalars['String']['output']>;
  actorType: Scalars['String']['output'];
  channel: CustomerConsentChannel;
  consent: CustomerConsent;
  contactPoint: Scalars['String']['output'];
  customer: Customer;
  evidence: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  idempotencyKey: Maybe<Scalars['String']['output']>;
  newState: CustomerConsentState;
  occurredAt: Scalars['DateTime']['output'];
  optInLevel: CustomerConsentOptInLevel;
  previousState: Maybe<CustomerConsentState>;
  requestId: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  sourceIp: Maybe<Scalars['String']['output']>;
  sourceLocationId: Maybe<Scalars['ID']['output']>;
  userAgent: Maybe<Scalars['String']['output']>;
};

export type CustomerConsentEventConnection = {
  __typename?: 'CustomerConsentEventConnection';
  edges: Array<CustomerConsentEventEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerConsentEventEdge = {
  __typename?: 'CustomerConsentEventEdge';
  cursor: Scalars['String']['output'];
  node: CustomerConsentEvent;
};

/** Ordering configuration for CustomerConsentEvent */
export type CustomerConsentEventOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerConsentEventOrderField;
};

/** Fields available for sorting CustomerConsentEvent */
export enum CustomerConsentEventOrderField {
  /** Sort by actorType */
  ActorType = 'actorType',
  /** Sort by channel */
  Channel = 'channel',
  /** Sort by id */
  Id = 'id',
  /** Sort by newState */
  NewState = 'newState',
  /** Sort by occurredAt */
  OccurredAt = 'occurredAt',
  /** Sort by source */
  Source = 'source'
}

export enum CustomerConsentOptInLevel {
  ConfirmedOptIn = 'CONFIRMED_OPT_IN',
  SingleOptIn = 'SINGLE_OPT_IN',
  Unknown = 'UNKNOWN'
}

export enum CustomerConsentState {
  Invalid = 'INVALID',
  NotSubscribed = 'NOT_SUBSCRIBED',
  Pending = 'PENDING',
  Redacted = 'REDACTED',
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export type CustomerConsentStateFilter = {
  _eq?: InputMaybe<CustomerConsentState>;
  _in?: InputMaybe<Array<CustomerConsentState>>;
  _neq?: InputMaybe<CustomerConsentState>;
  _notIn?: InputMaybe<Array<CustomerConsentState>>;
};

/** Consent transition scoped to the customer being updated. */
export type CustomerConsentUpdateOperationInput = {
  channel: CustomerConsentChannel;
  contactPoint: Scalars['String']['input'];
  evidence?: InputMaybe<Scalars['JSON']['input']>;
  /** Defaults to UNKNOWN when omitted. */
  optInLevel?: InputMaybe<CustomerConsentOptInLevel>;
  sourceLocationId?: InputMaybe<Scalars['ID']['input']>;
  state: CustomerConsentAdminState;
};

/** Batched consent transitions keyed by channel. */
export type CustomerConsentsUpdateInput = {
  set: Array<CustomerConsentUpdateOperationInput>;
};

/** Contact projections in the unified customer update. */
export type CustomerContactUpdateInput = {
  email?: InputMaybe<Scalars['Email']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerCreateInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  moderationNote?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerCreatePayload = {
  __typename?: 'CustomerCreatePayload';
  customer: Maybe<Customer>;
  userErrors: Array<GenericUserError>;
};

/** Auditable privacy access, export, correction or erasure workflow. */
export type CustomerDataRequest = Node & {
  __typename?: 'CustomerDataRequest';
  customer: Customer;
  dueAt: Maybe<Scalars['DateTime']['output']>;
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  legalBasis: Maybe<Scalars['String']['output']>;
  rejectionReason: Maybe<Scalars['String']['output']>;
  requestMetadata: Scalars['JSON']['output'];
  requestedAt: Scalars['DateTime']['output'];
  requestedById: Maybe<Scalars['String']['output']>;
  requestedByType: Scalars['String']['output'];
  resultFile: Maybe<File>;
  resultFileId: Maybe<Scalars['ID']['output']>;
  startedAt: Maybe<Scalars['DateTime']['output']>;
  status: CustomerDataRequestStatus;
  type: CustomerDataRequestType;
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerDataRequestCancelOperationInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerDataRequestConnection = {
  __typename?: 'CustomerDataRequestConnection';
  edges: Array<CustomerDataRequestEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerDataRequestCreateInput = {
  customerId: Scalars['ID']['input'];
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  legalBasis?: InputMaybe<Scalars['String']['input']>;
  requestMetadata?: InputMaybe<Scalars['JSON']['input']>;
  type: CustomerDataRequestType;
};

export type CustomerDataRequestCreatePayload = {
  __typename?: 'CustomerDataRequestCreatePayload';
  dataRequest: Maybe<CustomerDataRequest>;
  userErrors: Array<GenericUserError>;
};

export type CustomerDataRequestDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerDataRequestDeletePayload = {
  __typename?: 'CustomerDataRequestDeletePayload';
  deletedDataRequestId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerDataRequestEdge = {
  __typename?: 'CustomerDataRequestEdge';
  cursor: Scalars['String']['output'];
  node: CustomerDataRequest;
};

/** Ordering configuration for CustomerDataRequest */
export type CustomerDataRequestOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerDataRequestOrderField;
};

/** Fields available for sorting CustomerDataRequest */
export enum CustomerDataRequestOrderField {
  /** Sort by dueAt */
  DueAt = 'dueAt',
  /** Sort by finishedAt */
  FinishedAt = 'finishedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by requestedAt */
  RequestedAt = 'requestedAt',
  /** Sort by startedAt */
  StartedAt = 'startedAt',
  /** Sort by status */
  Status = 'status',
  /** Sort by type */
  Type = 'type',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export enum CustomerDataRequestStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export type CustomerDataRequestStatusFilter = {
  _eq?: InputMaybe<CustomerDataRequestStatus>;
  _in?: InputMaybe<Array<CustomerDataRequestStatus>>;
  _neq?: InputMaybe<CustomerDataRequestStatus>;
  _notIn?: InputMaybe<Array<CustomerDataRequestStatus>>;
};

export enum CustomerDataRequestType {
  Access = 'ACCESS',
  Correction = 'CORRECTION',
  Erasure = 'ERASURE',
  Export = 'EXPORT'
}

export type CustomerDataRequestTypeFilter = {
  _eq?: InputMaybe<CustomerDataRequestType>;
  _in?: InputMaybe<Array<CustomerDataRequestType>>;
  _neq?: InputMaybe<CustomerDataRequestType>;
  _notIn?: InputMaybe<Array<CustomerDataRequestType>>;
};

/** Update request metadata, its customer relation, or cancel the workflow. */
export type CustomerDataRequestUpdateInput = {
  cancel?: InputMaybe<CustomerDataRequestCancelOperationInput>;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  legalBasis?: InputMaybe<Scalars['String']['input']>;
  requestMetadata?: InputMaybe<Scalars['JSON']['input']>;
  type?: InputMaybe<CustomerDataRequestType>;
};

export type CustomerDataRequestUpdatePayload = {
  __typename?: 'CustomerDataRequestUpdatePayload';
  dataRequest: Maybe<CustomerDataRequest>;
  operationResults: Array<CustomerOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for CustomerDataRequest */
export type CustomerDataRequestWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerDataRequestWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerDataRequestWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerDataRequestWhereInput>>;
  /** Filter by customerId */
  customerId?: InputMaybe<IdFilter>;
  /** Filter by dueAt */
  dueAt?: InputMaybe<DateTimeFilter>;
  /** Filter by finishedAt */
  finishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by legalBasis */
  legalBasis?: InputMaybe<StringFilter>;
  /** Filter by requestedAt */
  requestedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by requestedById */
  requestedById?: InputMaybe<StringFilter>;
  /** Filter by requestedByType */
  requestedByType?: InputMaybe<StringFilter>;
  /** Filter by startedAt */
  startedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by status */
  status?: InputMaybe<CustomerDataRequestStatusFilter>;
  /** Filter by type */
  type?: InputMaybe<CustomerDataRequestTypeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type CustomerDeleteInput = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};

export type CustomerDeletePayload = {
  __typename?: 'CustomerDeletePayload';
  deletedCustomerId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerEdge = {
  __typename?: 'CustomerEdge';
  cursor: Scalars['String']['output'];
  node: Customer;
};

export type CustomerGroup = Node & {
  __typename?: 'CustomerGroup';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customerMemberships: CustomerGroupMembershipConnection;
  customersCount: Scalars['Int']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** Aggregate revision incremented by definition, state and membership changes. */
  revision: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type CustomerGroupCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<CustomerGroupMembershipWhereInput>;
};

export type CustomerGroupConnection = {
  __typename?: 'CustomerGroupConnection';
  edges: Array<CustomerGroupEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerGroupCreateInput = {
  code: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type CustomerGroupCreatePayload = {
  __typename?: 'CustomerGroupCreatePayload';
  group: Maybe<CustomerGroup>;
  userErrors: Array<GenericUserError>;
};

export type CustomerGroupDefinitionUpdateInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerGroupDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerGroupDeletePayload = {
  __typename?: 'CustomerGroupDeletePayload';
  deletedGroupId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerGroupEdge = {
  __typename?: 'CustomerGroupEdge';
  cursor: Scalars['String']['output'];
  node: CustomerGroup;
};

export type CustomerGroupMembership = Node & {
  __typename?: 'CustomerGroupMembership';
  assignedAt: Scalars['DateTime']['output'];
  assignedById: Maybe<Scalars['String']['output']>;
  customer: Customer;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  group: CustomerGroup;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isPrimary: Scalars['Boolean']['output'];
  source: CustomerAssignmentSource;
};

export type CustomerGroupMembershipConnection = {
  __typename?: 'CustomerGroupMembershipConnection';
  edges: Array<CustomerGroupMembershipEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerGroupMembershipEdge = {
  __typename?: 'CustomerGroupMembershipEdge';
  cursor: Scalars['String']['output'];
  node: CustomerGroupMembership;
};

/** Ordering configuration for CustomerGroupMembership */
export type CustomerGroupMembershipOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerGroupMembershipOrderField;
};

/** Fields available for sorting CustomerGroupMembership */
export enum CustomerGroupMembershipOrderField {
  /** Sort by assignedAt */
  AssignedAt = 'assignedAt',
  /** Sort by expiresAt */
  ExpiresAt = 'expiresAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isPrimary */
  IsPrimary = 'isPrimary',
  /** Sort by source */
  Source = 'source'
}

/** Create a customer's membership in this group. */
export type CustomerGroupMembershipRelationCreateInput = {
  customerId: Scalars['ID']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CustomerGroupMembershipRelationUpdateInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  membershipId: Scalars['ID']['input'];
};

export type CustomerGroupMembershipRelationsUpdateInput = {
  create?: InputMaybe<Array<CustomerGroupMembershipRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<CustomerGroupMembershipRelationUpdateInput>>;
};

/** One group membership used by the unified customer update. */
export type CustomerGroupMembershipUpdateOperationInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  groupId: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Filter conditions for CustomerGroupMembership */
export type CustomerGroupMembershipWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerGroupMembershipWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerGroupMembershipWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerGroupMembershipWhereInput>>;
  /** Filter by assignedAt */
  assignedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<IdFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<DateTimeFilter>;
  /** Filter by groupId */
  groupId?: InputMaybe<IdFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isPrimary */
  isPrimary?: InputMaybe<BooleanFilter>;
  /** Filter by source */
  source?: InputMaybe<CustomerAssignmentSourceFilter>;
};

/** Replace all manual group memberships for the customer. */
export type CustomerGroupMembershipsUpdateInput = {
  memberships: Array<CustomerGroupMembershipUpdateOperationInput>;
};

/** Ordering configuration for CustomerGroup */
export type CustomerGroupOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerGroupOrderField;
};

/** Fields available for sorting CustomerGroup */
export enum CustomerGroupOrderField {
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isActive */
  IsActive = 'isActive',
  /** Sort by isDefault */
  IsDefault = 'isDefault',
  /** Sort by name */
  Name = 'name',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type CustomerGroupStateUpdateInput = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CustomerGroupUpdateInput = {
  definition?: InputMaybe<CustomerGroupDefinitionUpdateInput>;
  /** Create, update, or delete customer memberships in this group. */
  memberships?: InputMaybe<CustomerGroupMembershipRelationsUpdateInput>;
  state?: InputMaybe<CustomerGroupStateUpdateInput>;
};

export type CustomerGroupUpdatePayload = {
  __typename?: 'CustomerGroupUpdatePayload';
  group: Maybe<CustomerGroup>;
  operationResults: Array<CustomerOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for CustomerGroup */
export type CustomerGroupWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerGroupWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerGroupWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerGroupWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isActive */
  isActive?: InputMaybe<BooleanFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<BooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by revision */
  revision?: InputMaybe<IntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export enum CustomerLifecycleStatus {
  Active = 'ACTIVE',
  Blocked = 'BLOCKED',
  Disabled = 'DISABLED',
  Merged = 'MERGED',
  Redacted = 'REDACTED'
}

export type CustomerLifecycleStatusFilter = {
  _eq?: InputMaybe<CustomerLifecycleStatus>;
  _in?: InputMaybe<Array<CustomerLifecycleStatus>>;
  _neq?: InputMaybe<CustomerLifecycleStatus>;
  _notIn?: InputMaybe<Array<CustomerLifecycleStatus>>;
};

/** Idempotent workflow that merges one customer profile into another. */
export type CustomerMerge = Node & {
  __typename?: 'CustomerMerge';
  errorCode: Maybe<Scalars['String']['output']>;
  errorMessage: Maybe<Scalars['String']['output']>;
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  reason: Maybe<Scalars['String']['output']>;
  requestedAt: Scalars['DateTime']['output'];
  requestedById: Maybe<Scalars['String']['output']>;
  requestedByType: Scalars['String']['output'];
  resolution: Scalars['JSON']['output'];
  sourceCustomer: Customer;
  startedAt: Maybe<Scalars['DateTime']['output']>;
  status: CustomerMergeStatus;
  targetCustomer: Customer;
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerMergeConnection = {
  __typename?: 'CustomerMergeConnection';
  edges: Array<CustomerMergeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerMergeCreateInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  sourceCustomerId: Scalars['ID']['input'];
  targetCustomerId: Scalars['ID']['input'];
};

export type CustomerMergeCreatePayload = {
  __typename?: 'CustomerMergeCreatePayload';
  merge: Maybe<CustomerMerge>;
  userErrors: Array<GenericUserError>;
};

export type CustomerMergeDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerMergeDeletePayload = {
  __typename?: 'CustomerMergeDeletePayload';
  deletedMergeId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerMergeEdge = {
  __typename?: 'CustomerMergeEdge';
  cursor: Scalars['String']['output'];
  node: CustomerMerge;
};

/** Ordering configuration for CustomerMerge */
export type CustomerMergeOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerMergeOrderField;
};

/** Fields available for sorting CustomerMerge */
export enum CustomerMergeOrderField {
  /** Sort by finishedAt */
  FinishedAt = 'finishedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by requestedAt */
  RequestedAt = 'requestedAt',
  /** Sort by startedAt */
  StartedAt = 'startedAt',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export enum CustomerMergeStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  InProgress = 'IN_PROGRESS',
  Requested = 'REQUESTED'
}

export type CustomerMergeStatusFilter = {
  _eq?: InputMaybe<CustomerMergeStatus>;
  _in?: InputMaybe<Array<CustomerMergeStatus>>;
  _neq?: InputMaybe<CustomerMergeStatus>;
  _notIn?: InputMaybe<Array<CustomerMergeStatus>>;
};

/** Update merge metadata or either customer relation before processing starts. */
export type CustomerMergeUpdateInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  sourceCustomerId?: InputMaybe<Scalars['ID']['input']>;
  targetCustomerId?: InputMaybe<Scalars['ID']['input']>;
};

export type CustomerMergeUpdatePayload = {
  __typename?: 'CustomerMergeUpdatePayload';
  merge: Maybe<CustomerMerge>;
  operationResults: Array<CustomerOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for CustomerMerge */
export type CustomerMergeWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerMergeWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerMergeWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerMergeWhereInput>>;
  /** Filter by errorCode */
  errorCode?: InputMaybe<StringFilter>;
  /** Filter by finishedAt */
  finishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by idempotencyKey */
  idempotencyKey?: InputMaybe<StringFilter>;
  /** Filter by requestedAt */
  requestedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by requestedById */
  requestedById?: InputMaybe<StringFilter>;
  /** Filter by requestedByType */
  requestedByType?: InputMaybe<StringFilter>;
  /** Filter by sourceCustomerId */
  sourceCustomerId?: InputMaybe<IdFilter>;
  /** Filter by startedAt */
  startedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by status */
  status?: InputMaybe<CustomerMergeStatusFilter>;
  /** Filter by targetCustomerId */
  targetCustomerId?: InputMaybe<IdFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Internal moderation context independent from the merchant note. */
export type CustomerModerationUpdateInput = {
  moderationNote?: InputMaybe<Scalars['String']['input']>;
};

/** Rebuildable monetary customer projection for one ISO 4217 currency. */
export type CustomerMonetaryStatistics = Node & {
  __typename?: 'CustomerMonetaryStatistics';
  averageOrderValueMinor: Scalars['BigInt']['output'];
  currencyCode: CurrencyCode;
  customer: Customer;
  id: Scalars['ID']['output'];
  netSpentMinor: Scalars['BigInt']['output'];
  ordersCount: Scalars['Int']['output'];
  totalRefundedMinor: Scalars['BigInt']['output'];
  totalSpentMinor: Scalars['BigInt']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerMonetaryStatisticsConnection = {
  __typename?: 'CustomerMonetaryStatisticsConnection';
  edges: Array<CustomerMonetaryStatisticsEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerMonetaryStatisticsEdge = {
  __typename?: 'CustomerMonetaryStatisticsEdge';
  cursor: Scalars['String']['output'];
  node: CustomerMonetaryStatistics;
};

/** Ordering configuration for CustomerMonetaryStatistics */
export type CustomerMonetaryStatisticsOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerMonetaryStatisticsOrderField;
};

/** Fields available for sorting CustomerMonetaryStatistics */
export enum CustomerMonetaryStatisticsOrderField {
  /** Sort by averageOrderValueMinor */
  AverageOrderValueMinor = 'averageOrderValueMinor',
  /** Sort by currencyCode */
  CurrencyCode = 'currencyCode',
  /** Sort by id */
  Id = 'id',
  /** Sort by netSpentMinor */
  NetSpentMinor = 'netSpentMinor',
  /** Sort by ordersCount */
  OrdersCount = 'ordersCount',
  /** Sort by totalRefundedMinor */
  TotalRefundedMinor = 'totalRefundedMinor',
  /** Sort by totalSpentMinor */
  TotalSpentMinor = 'totalSpentMinor',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Filter conditions for CustomerMonetaryStatistics */
export type CustomerMonetaryStatisticsWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerMonetaryStatisticsWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerMonetaryStatisticsWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerMonetaryStatisticsWhereInput>>;
  /** Filter by averageOrderValueMinor */
  averageOrderValueMinor?: InputMaybe<BigIntFilter>;
  /** Filter by currencyCode */
  currencyCode?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by netSpentMinor */
  netSpentMinor?: InputMaybe<BigIntFilter>;
  /** Filter by ordersCount */
  ordersCount?: InputMaybe<IntFilter>;
  /** Filter by totalRefundedMinor */
  totalRefundedMinor?: InputMaybe<BigIntFilter>;
  /** Filter by totalSpentMinor */
  totalSpentMinor?: InputMaybe<BigIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Merchant note in the unified customer update. */
export type CustomerNoteUpdateInput = {
  note?: InputMaybe<Scalars['String']['input']>;
};

/** Result of one operation in a customer-domain update. */
export type CustomerOperationResult = {
  __typename?: 'CustomerOperationResult';
  applied: Scalars['Boolean']['output'];
  errors: Array<GenericUserError>;
  type: CustomerOperationType;
};

export enum CustomerOperationType {
  AddressUpdate = 'ADDRESS_UPDATE',
  CompanyUpdate = 'COMPANY_UPDATE',
  ConsentUpdate = 'CONSENT_UPDATE',
  ContactUpdate = 'CONTACT_UPDATE',
  DataRequestUpdate = 'DATA_REQUEST_UPDATE',
  GroupUpdate = 'GROUP_UPDATE',
  MergeUpdate = 'MERGE_UPDATE',
  ModerationUpdate = 'MODERATION_UPDATE',
  NoteUpdate = 'NOTE_UPDATE',
  ProfileUpdate = 'PROFILE_UPDATE',
  SegmentUpdate = 'SEGMENT_UPDATE',
  StatusUpdate = 'STATUS_UPDATE',
  TagUpdate = 'TAG_UPDATE',
  TaxExemptionUpdate = 'TAX_EXEMPTION_UPDATE',
  TaxIdentifierUpdate = 'TAX_IDENTIFIER_UPDATE'
}

/** Ordering configuration for Customer */
export type CustomerOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerOrderField;
};

/** Fields available for sorting Customer */
export enum CustomerOrderField {
  /** Sort by accountStatus */
  AccountStatus = 'accountStatus',
  /** Sort by companyName */
  CompanyName = 'companyName',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by dateOfBirth */
  DateOfBirth = 'dateOfBirth',
  /** Sort by displayName */
  DisplayName = 'displayName',
  /** Sort by email */
  Email = 'email',
  /** Sort by firstName */
  FirstName = 'firstName',
  /** Sort by id */
  Id = 'id',
  /** Sort by lastActivityAt */
  LastActivityAt = 'lastActivityAt',
  /** Sort by lastName */
  LastName = 'lastName',
  /** Sort by lastOrderAt */
  LastOrderAt = 'lastOrderAt',
  /** Sort by lifecycleStatus */
  LifecycleStatus = 'lifecycleStatus',
  /** Sort by ordersCount */
  OrdersCount = 'ordersCount',
  /** Sort by phoneE164 */
  PhoneE164 = 'phoneE164',
  /** Sort by totalSpentMinor */
  TotalSpentMinor = 'totalSpentMinor',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Personal profile fields in the unified customer update. */
export type CustomerProfileUpdateInput = {
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerSegment = Node & {
  __typename?: 'CustomerSegment';
  /** Optional merchant-selected #RRGGBB presentation color. */
  color: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdById: Maybe<Scalars['String']['output']>;
  customerMemberships: CustomerSegmentMembershipConnection;
  customersCount: Scalars['Int']['output'];
  definition: Scalars['JSON']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  query: Maybe<Scalars['String']['output']>;
  /** Aggregate revision incremented by definition, state and membership changes. */
  revision: Scalars['Int']['output'];
  status: CustomerSegmentStatus;
  type: CustomerSegmentType;
  updatedAt: Scalars['DateTime']['output'];
};


export type CustomerSegmentCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<CustomerSegmentMembershipWhereInput>;
};

export type CustomerSegmentConnection = {
  __typename?: 'CustomerSegmentConnection';
  edges: Array<CustomerSegmentEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerSegmentCreateInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  definition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to DRAFT when omitted. */
  status?: InputMaybe<CustomerSegmentStatus>;
  type: CustomerSegmentType;
};

export type CustomerSegmentCreatePayload = {
  __typename?: 'CustomerSegmentCreatePayload';
  segment: Maybe<CustomerSegment>;
  userErrors: Array<GenericUserError>;
};

export type CustomerSegmentDefinitionUpdateInput = {
  definition?: InputMaybe<Scalars['JSON']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<CustomerSegmentType>;
};

export type CustomerSegmentDeleteInput = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};

export type CustomerSegmentDeletePayload = {
  __typename?: 'CustomerSegmentDeletePayload';
  deletedSegmentId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerSegmentDetailsUpdateInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerSegmentEdge = {
  __typename?: 'CustomerSegmentEdge';
  cursor: Scalars['String']['output'];
  node: CustomerSegment;
};

export type CustomerSegmentMembership = Node & {
  __typename?: 'CustomerSegmentMembership';
  customer: Customer;
  evaluatedAt: Scalars['DateTime']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  segment: CustomerSegment;
  source: CustomerAssignmentSource;
};

export type CustomerSegmentMembershipConnection = {
  __typename?: 'CustomerSegmentMembershipConnection';
  edges: Array<CustomerSegmentMembershipEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerSegmentMembershipEdge = {
  __typename?: 'CustomerSegmentMembershipEdge';
  cursor: Scalars['String']['output'];
  node: CustomerSegmentMembership;
};

/** Ordering configuration for CustomerSegmentMembership */
export type CustomerSegmentMembershipOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerSegmentMembershipOrderField;
};

/** Fields available for sorting CustomerSegmentMembership */
export enum CustomerSegmentMembershipOrderField {
  /** Sort by evaluatedAt */
  EvaluatedAt = 'evaluatedAt',
  /** Sort by expiresAt */
  ExpiresAt = 'expiresAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by source */
  Source = 'source'
}

export type CustomerSegmentMembershipRelationCreateInput = {
  customerId: Scalars['ID']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type CustomerSegmentMembershipRelationUpdateInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  membershipId: Scalars['ID']['input'];
};

export type CustomerSegmentMembershipRelationsUpdateInput = {
  create?: InputMaybe<Array<CustomerSegmentMembershipRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Atomically replace all manual memberships with these customers. */
  setCustomerIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<CustomerSegmentMembershipRelationUpdateInput>>;
};

/** Filter conditions for CustomerSegmentMembership */
export type CustomerSegmentMembershipWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerSegmentMembershipWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerSegmentMembershipWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerSegmentMembershipWhereInput>>;
  /** Filter by customerId */
  customerId?: InputMaybe<IdFilter>;
  /** Filter by evaluatedAt */
  evaluatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by segmentId */
  segmentId?: InputMaybe<IdFilter>;
  /** Filter by source */
  source?: InputMaybe<CustomerAssignmentSourceFilter>;
};

/** Replace all manual segment memberships for the customer. */
export type CustomerSegmentMembershipsUpdateInput = {
  segmentIds: Array<Scalars['ID']['input']>;
};

/** Ordering configuration for CustomerSegment */
export type CustomerSegmentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerSegmentOrderField;
};

/** Fields available for sorting CustomerSegment */
export enum CustomerSegmentOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by customersCount */
  CustomersCount = 'customersCount',
  /** Sort by id */
  Id = 'id',
  /** Sort by name */
  Name = 'name',
  /** Sort by status */
  Status = 'status',
  /** Sort by type */
  Type = 'type',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type CustomerSegmentStateUpdateInput = {
  status?: InputMaybe<CustomerSegmentStatus>;
};

export enum CustomerSegmentStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT'
}

export type CustomerSegmentStatusFilter = {
  _eq?: InputMaybe<CustomerSegmentStatus>;
  _in?: InputMaybe<Array<CustomerSegmentStatus>>;
  _neq?: InputMaybe<CustomerSegmentStatus>;
  _notIn?: InputMaybe<Array<CustomerSegmentStatus>>;
};

export enum CustomerSegmentType {
  Dynamic = 'DYNAMIC',
  Manual = 'MANUAL'
}

export type CustomerSegmentTypeFilter = {
  _eq?: InputMaybe<CustomerSegmentType>;
  _in?: InputMaybe<Array<CustomerSegmentType>>;
  _neq?: InputMaybe<CustomerSegmentType>;
  _notIn?: InputMaybe<Array<CustomerSegmentType>>;
};

export type CustomerSegmentUpdateInput = {
  definition?: InputMaybe<CustomerSegmentDefinitionUpdateInput>;
  details?: InputMaybe<CustomerSegmentDetailsUpdateInput>;
  /** Create, update, delete, or replace manual customer memberships. */
  memberships?: InputMaybe<CustomerSegmentMembershipRelationsUpdateInput>;
  state?: InputMaybe<CustomerSegmentStateUpdateInput>;
};

export type CustomerSegmentUpdatePayload = {
  __typename?: 'CustomerSegmentUpdatePayload';
  operationResults: Array<CustomerOperationResult>;
  segment: Maybe<CustomerSegment>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for CustomerSegment */
export type CustomerSegmentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerSegmentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerSegmentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerSegmentWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by createdById */
  createdById?: InputMaybe<StringFilter>;
  /** Filter by customersCount */
  customersCount?: InputMaybe<IntFilter>;
  /** Filter by description */
  description?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<CustomerSegmentStatusFilter>;
  /** Filter by type */
  type?: InputMaybe<CustomerSegmentTypeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Rebuildable, currency-independent customer activity projection. */
export type CustomerStatistics = {
  __typename?: 'CustomerStatistics';
  cancelledOrdersCount: Scalars['Int']['output'];
  completedOrdersCount: Scalars['Int']['output'];
  customer: Customer;
  firstOrderAt: Maybe<Scalars['DateTime']['output']>;
  /** Raw Orders service UUID; Orders Admin type is not a federation entity. */
  firstOrderId: Maybe<Scalars['ID']['output']>;
  lastCheckoutAt: Maybe<Scalars['DateTime']['output']>;
  lastOrderAt: Maybe<Scalars['DateTime']['output']>;
  lastOrderId: Maybe<Scalars['ID']['output']>;
  ordersCount: Scalars['Int']['output'];
  returnsCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Lifecycle fields available to Admin. Merge and redaction remain dedicated
 * workflows and cannot be selected here.
 */
export type CustomerStatusUpdateInput = {
  /** Required for BLOCKED. Omit for ACTIVE and DISABLED. */
  blockedReason?: InputMaybe<Scalars['String']['input']>;
  status: CustomerAdminLifecycleStatus;
};

export type CustomerTag = Node & {
  __typename?: 'CustomerTag';
  createdAt: Scalars['DateTime']['output'];
  customerAssignments: CustomerTagAssignmentConnection;
  customersCount: Scalars['Int']['output'];
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  normalizedName: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type CustomerTagCustomerAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<CustomerTagAssignmentWhereInput>;
};

export type CustomerTagAssignment = Node & {
  __typename?: 'CustomerTagAssignment';
  assignedAt: Scalars['DateTime']['output'];
  assignedById: Maybe<Scalars['String']['output']>;
  customer: Customer;
  id: Scalars['ID']['output'];
  tag: CustomerTag;
};

export type CustomerTagAssignmentConnection = {
  __typename?: 'CustomerTagAssignmentConnection';
  edges: Array<CustomerTagAssignmentEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTagAssignmentEdge = {
  __typename?: 'CustomerTagAssignmentEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTagAssignment;
};

/** Ordering configuration for CustomerTagAssignment */
export type CustomerTagAssignmentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTagAssignmentOrderField;
};

/** Fields available for sorting CustomerTagAssignment */
export enum CustomerTagAssignmentOrderField {
  /** Sort by assignedAt */
  AssignedAt = 'assignedAt',
  /** Sort by id */
  Id = 'id'
}

export type CustomerTagAssignmentRelationCreateInput = {
  customerId: Scalars['ID']['input'];
};

export type CustomerTagAssignmentRelationsUpdateInput = {
  create?: InputMaybe<Array<CustomerTagAssignmentRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Filter conditions for CustomerTagAssignment */
export type CustomerTagAssignmentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerTagAssignmentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerTagAssignmentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerTagAssignmentWhereInput>>;
  /** Filter by assignedAt */
  assignedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by assignedById */
  assignedById?: InputMaybe<StringFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<IdFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by tagId */
  tagId?: InputMaybe<IdFilter>;
};

/** Replace all tag assignments for the customer. */
export type CustomerTagAssignmentsUpdateInput = {
  tagIds: Array<Scalars['ID']['input']>;
};

export type CustomerTagConnection = {
  __typename?: 'CustomerTagConnection';
  edges: Array<CustomerTagEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTagCreateInput = {
  name: Scalars['String']['input'];
};

export type CustomerTagCreatePayload = {
  __typename?: 'CustomerTagCreatePayload';
  tag: Maybe<CustomerTag>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTagDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CustomerTagDeletePayload = {
  __typename?: 'CustomerTagDeletePayload';
  deletedTagId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerTagEdge = {
  __typename?: 'CustomerTagEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTag;
};

/** Ordering configuration for CustomerTag */
export type CustomerTagOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTagOrderField;
};

/** Fields available for sorting CustomerTag */
export enum CustomerTagOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by name */
  Name = 'name',
  /** Sort by normalizedName */
  NormalizedName = 'normalizedName',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type CustomerTagUpdateInput = {
  /** Create or delete customer assignments for this tag. */
  assignments?: InputMaybe<CustomerTagAssignmentRelationsUpdateInput>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerTagUpdatePayload = {
  __typename?: 'CustomerTagUpdatePayload';
  operationResults: Array<CustomerOperationResult>;
  tag: Maybe<CustomerTag>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for CustomerTag */
export type CustomerTagWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerTagWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerTagWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerTagWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by normalizedName */
  normalizedName?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type CustomerTaxExemption = Node & {
  __typename?: 'CustomerTaxExemption';
  certificateFile: Maybe<File>;
  certificateFileId: Maybe<Scalars['ID']['output']>;
  code: Scalars['String']['output'];
  countryCode: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  reason: Maybe<Scalars['String']['output']>;
  regionCode: Maybe<Scalars['String']['output']>;
  status: CustomerTaxExemptionStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom: Maybe<Scalars['Date']['output']>;
  validTo: Maybe<Scalars['Date']['output']>;
};

export type CustomerTaxExemptionConnection = {
  __typename?: 'CustomerTaxExemptionConnection';
  edges: Array<CustomerTaxExemptionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTaxExemptionCreateOperationInput = {
  certificateFileId?: InputMaybe<Scalars['ID']['input']>;
  code: Scalars['String']['input'];
  countryCode?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to ACTIVE when omitted. */
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
};

export type CustomerTaxExemptionEdge = {
  __typename?: 'CustomerTaxExemptionEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTaxExemption;
};

/** Ordering configuration for CustomerTaxExemption */
export type CustomerTaxExemptionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTaxExemptionOrderField;
};

/** Fields available for sorting CustomerTaxExemption */
export enum CustomerTaxExemptionOrderField {
  /** Sort by code */
  Code = 'code',
  /** Sort by countryCode */
  CountryCode = 'countryCode',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by regionCode */
  RegionCode = 'regionCode',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by validFrom */
  ValidFrom = 'validFrom',
  /** Sort by validTo */
  ValidTo = 'validTo'
}

export type CustomerTaxExemptionPatchInput = {
  certificateFileId?: InputMaybe<Scalars['ID']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
};

export enum CustomerTaxExemptionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED'
}

export type CustomerTaxExemptionStatusFilter = {
  _eq?: InputMaybe<CustomerTaxExemptionStatus>;
  _in?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
  _neq?: InputMaybe<CustomerTaxExemptionStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
};

export type CustomerTaxExemptionUpdateOperationInput = {
  operations: CustomerTaxExemptionPatchInput;
  taxExemptionId: Scalars['ID']['input'];
};

/** Filter conditions for CustomerTaxExemption */
export type CustomerTaxExemptionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerTaxExemptionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerTaxExemptionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerTaxExemptionWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<StringFilter>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by regionCode */
  regionCode?: InputMaybe<StringFilter>;
  /** Filter by status */
  status?: InputMaybe<CustomerTaxExemptionStatusFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by validFrom */
  validFrom?: InputMaybe<DateFilter>;
  /** Filter by validTo */
  validTo?: InputMaybe<DateFilter>;
};

/** Batched tax exemption changes scoped to the customer being updated. */
export type CustomerTaxExemptionsUpdateInput = {
  create?: InputMaybe<Array<CustomerTaxExemptionCreateOperationInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<CustomerTaxExemptionUpdateOperationInput>>;
};

export type CustomerTaxIdentifier = Node & {
  __typename?: 'CustomerTaxIdentifier';
  countryCode: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: Customer;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  identifierType: Scalars['String']['output'];
  isPrimary: Scalars['Boolean']['output'];
  normalizedValue: Scalars['String']['output'];
  status: CustomerTaxIdentifierStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom: Maybe<Scalars['Date']['output']>;
  validTo: Maybe<Scalars['Date']['output']>;
  value: Scalars['String']['output'];
  verifiedAt: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerTaxIdentifierConnection = {
  __typename?: 'CustomerTaxIdentifierConnection';
  edges: Array<CustomerTaxIdentifierEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTaxIdentifierCreateOperationInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  identifierType: Scalars['String']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  /** Defaults to UNVERIFIED when omitted. */
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
  value: Scalars['String']['input'];
};

export type CustomerTaxIdentifierEdge = {
  __typename?: 'CustomerTaxIdentifierEdge';
  cursor: Scalars['String']['output'];
  node: CustomerTaxIdentifier;
};

/** Ordering configuration for CustomerTaxIdentifier */
export type CustomerTaxIdentifierOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTaxIdentifierOrderField;
};

/** Fields available for sorting CustomerTaxIdentifier */
export enum CustomerTaxIdentifierOrderField {
  /** Sort by countryCode */
  CountryCode = 'countryCode',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by identifierType */
  IdentifierType = 'identifierType',
  /** Sort by isPrimary */
  IsPrimary = 'isPrimary',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by validFrom */
  ValidFrom = 'validFrom',
  /** Sort by validTo */
  ValidTo = 'validTo'
}

export type CustomerTaxIdentifierPatchInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  identifierType?: InputMaybe<Scalars['String']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export enum CustomerTaxIdentifierStatus {
  Expired = 'EXPIRED',
  Rejected = 'REJECTED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type CustomerTaxIdentifierStatusFilter = {
  _eq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _in?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
  _neq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
};

export type CustomerTaxIdentifierUpdateOperationInput = {
  operations: CustomerTaxIdentifierPatchInput;
  taxIdentifierId: Scalars['ID']['input'];
};

/** Filter conditions for CustomerTaxIdentifier */
export type CustomerTaxIdentifierWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerTaxIdentifierWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerTaxIdentifierWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerTaxIdentifierWhereInput>>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by identifierType */
  identifierType?: InputMaybe<StringFilter>;
  /** Filter by isPrimary */
  isPrimary?: InputMaybe<BooleanFilter>;
  /** Filter by status */
  status?: InputMaybe<CustomerTaxIdentifierStatusFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by validFrom */
  validFrom?: InputMaybe<DateFilter>;
  /** Filter by validTo */
  validTo?: InputMaybe<DateFilter>;
  /** Filter by value */
  value?: InputMaybe<StringFilter>;
};

/** Batched tax identifier changes scoped to the customer being updated. */
export type CustomerTaxIdentifiersUpdateInput = {
  create?: InputMaybe<Array<CustomerTaxIdentifierCreateOperationInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<CustomerTaxIdentifierUpdateOperationInput>>;
};

/** Customer-level sections executed by the unified customerUpdate workflow. */
export type CustomerUpdateInput = {
  addresses?: InputMaybe<CustomerAddressesUpdateInput>;
  company?: InputMaybe<CustomerCompanyUpdateInput>;
  consents?: InputMaybe<CustomerConsentsUpdateInput>;
  contact?: InputMaybe<CustomerContactUpdateInput>;
  groups?: InputMaybe<CustomerGroupMembershipsUpdateInput>;
  moderation?: InputMaybe<CustomerModerationUpdateInput>;
  note?: InputMaybe<CustomerNoteUpdateInput>;
  profile?: InputMaybe<CustomerProfileUpdateInput>;
  segments?: InputMaybe<CustomerSegmentMembershipsUpdateInput>;
  status?: InputMaybe<CustomerStatusUpdateInput>;
  tags?: InputMaybe<CustomerTagAssignmentsUpdateInput>;
  taxExemptions?: InputMaybe<CustomerTaxExemptionsUpdateInput>;
  taxIdentifiers?: InputMaybe<CustomerTaxIdentifiersUpdateInput>;
};

export type CustomerUpdatePayload = {
  __typename?: 'CustomerUpdatePayload';
  customer: Maybe<Customer>;
  operationResults: Array<CustomerOperationResult>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for Customer */
export type CustomerWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CustomerWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CustomerWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CustomerWhereInput>>;
  /** Filter by accountStatus */
  accountStatus?: InputMaybe<CustomerAccountStatusFilter>;
  /** Filter by companyName */
  companyName?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by dateOfBirth */
  dateOfBirth?: InputMaybe<DateFilter>;
  /** Filter by defaultShippingCity */
  defaultShippingCity?: InputMaybe<StringFilter>;
  /** Filter by defaultShippingCountryCode */
  defaultShippingCountryCode?: InputMaybe<StringFilter>;
  /** Filter by defaultShippingRegionCode */
  defaultShippingRegionCode?: InputMaybe<StringFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<StringFilter>;
  /** Filter by email */
  email?: InputMaybe<StringFilter>;
  /** Filter by emailMarketingState */
  emailMarketingState?: InputMaybe<CustomerConsentStateFilter>;
  /** Filter by emailVerified */
  emailVerified?: InputMaybe<BooleanFilter>;
  /** Filter by firstName */
  firstName?: InputMaybe<StringFilter>;
  /** Filter by iamPrincipalId */
  iamPrincipalId?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by lastActivityAt */
  lastActivityAt?: InputMaybe<DateTimeFilter>;
  /** Filter by lastName */
  lastName?: InputMaybe<StringFilter>;
  /** Filter by lastOrderAt */
  lastOrderAt?: InputMaybe<DateTimeFilter>;
  /** Filter by lifecycleStatus */
  lifecycleStatus?: InputMaybe<CustomerLifecycleStatusFilter>;
  /** Filter by ordersCount */
  ordersCount?: InputMaybe<IntFilter>;
  /** Filter by phoneE164 */
  phoneE164?: InputMaybe<StringFilter>;
  /** Filter by phoneVerified */
  phoneVerified?: InputMaybe<BooleanFilter>;
  /** Filter by preferredLocale */
  preferredLocale?: InputMaybe<StringFilter>;
  /** Match customers with a current membership in the selected segment IDs. */
  segmentId?: InputMaybe<IdFilter>;
  /** Filter by source */
  source?: InputMaybe<StringFilter>;
  /** Filter by totalSpentMinor */
  totalSpentMinor?: InputMaybe<BigIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Store-scoped customer commands. */
export type CustomersMutation = {
  __typename?: 'CustomersMutation';
  /** Replace the enabled customer authentication methods for the current store. */
  customerAccountsSettingsUpdate: CustomerAccountsSettingsUpdatePayload;
  customerCreate: CustomerCreatePayload;
  customerDataRequestCreate: CustomerDataRequestCreatePayload;
  customerDataRequestDelete: CustomerDataRequestDeletePayload;
  customerDataRequestUpdate: CustomerDataRequestUpdatePayload;
  customerDelete: CustomerDeletePayload;
  customerGroupCreate: CustomerGroupCreatePayload;
  customerGroupDelete: CustomerGroupDeletePayload;
  customerGroupUpdate: CustomerGroupUpdatePayload;
  customerMergeCreate: CustomerMergeCreatePayload;
  customerMergeDelete: CustomerMergeDeletePayload;
  customerMergeUpdate: CustomerMergeUpdatePayload;
  customerSegmentCreate: CustomerSegmentCreatePayload;
  customerSegmentDelete: CustomerSegmentDeletePayload;
  customerSegmentUpdate: CustomerSegmentUpdatePayload;
  customerTagCreate: CustomerTagCreatePayload;
  customerTagDelete: CustomerTagDeletePayload;
  customerTagUpdate: CustomerTagUpdatePayload;
  /** Unified customer profile update with optimistic locking. */
  customerUpdate: CustomerUpdatePayload;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerAccountsSettingsUpdateArgs = {
  input: CustomerAccountsSettingsUpdateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerCreateArgs = {
  input: CustomerCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerDataRequestCreateArgs = {
  input: CustomerDataRequestCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerDataRequestDeleteArgs = {
  input: CustomerDataRequestDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerDataRequestUpdateArgs = {
  dataRequestId: Scalars['ID']['input'];
  operations?: InputMaybe<CustomerDataRequestUpdateInput>;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerDeleteArgs = {
  input: CustomerDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupCreateArgs = {
  input: CustomerGroupCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupDeleteArgs = {
  input: CustomerGroupDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerGroupUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  groupId: Scalars['ID']['input'];
  operations: CustomerGroupUpdateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerMergeCreateArgs = {
  input: CustomerMergeCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerMergeDeleteArgs = {
  input: CustomerMergeDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerMergeUpdateArgs = {
  mergeId: Scalars['ID']['input'];
  operations?: InputMaybe<CustomerMergeUpdateInput>;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentCreateArgs = {
  input: CustomerSegmentCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentDeleteArgs = {
  input: CustomerSegmentDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerSegmentUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  operations: CustomerSegmentUpdateInput;
  segmentId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagCreateArgs = {
  input: CustomerTagCreateInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagDeleteArgs = {
  input: CustomerTagDeleteInput;
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerTagUpdateArgs = {
  operations?: InputMaybe<CustomerTagUpdateInput>;
  tagId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type CustomersMutationCustomerUpdateArgs = {
  customerId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations: CustomerUpdateInput;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQuery = {
  __typename?: 'CustomersQuery';
  customer: Maybe<Customer>;
  /** Authentication settings for customer accounts in the current store. */
  customerAccountsSettings: Maybe<CustomerAccountsSettings>;
  customerAddress: Maybe<CustomerAddress>;
  customerByEmail: Maybe<Customer>;
  customerConsent: Maybe<CustomerConsent>;
  customerDataRequest: Maybe<CustomerDataRequest>;
  customerDataRequests: CustomerDataRequestConnection;
  customerGroup: Maybe<CustomerGroup>;
  customerGroups: CustomerGroupConnection;
  customerMerge: Maybe<CustomerMerge>;
  customerMerges: CustomerMergeConnection;
  customerSegment: Maybe<CustomerSegment>;
  customerSegments: CustomerSegmentConnection;
  customerTag: Maybe<CustomerTag>;
  customerTags: CustomerTagConnection;
  customerTaxExemption: Maybe<CustomerTaxExemption>;
  customerTaxIdentifier: Maybe<CustomerTaxIdentifier>;
  customers: CustomerConnection;
  /** Resolve a customer-owned Relay node by global ID. */
  node: Maybe<Node>;
  /** Resolve customer-owned Relay nodes while preserving input order. */
  nodes: Array<Maybe<Node>>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerAddressArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerByEmailArgs = {
  email: Scalars['Email']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerConsentArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerDataRequestArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerDataRequestsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerDataRequestOrderByInput>>;
  where?: InputMaybe<CustomerDataRequestWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerGroupArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerGroupOrderByInput>>;
  where?: InputMaybe<CustomerGroupWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerMergeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerMergesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerMergeOrderByInput>>;
  where?: InputMaybe<CustomerMergeWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerSegmentArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerSegmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerSegmentOrderByInput>>;
  where?: InputMaybe<CustomerSegmentWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTagArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerTagOrderByInput>>;
  where?: InputMaybe<CustomerTagWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTaxExemptionArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomerTaxIdentifierArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryCustomersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<CustomerOrderByInput>>;
  where?: InputMaybe<CustomerWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type CustomersQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type DateFilter = {
  _between?: InputMaybe<Array<Scalars['Date']['input']>>;
  _eq?: InputMaybe<Scalars['Date']['input']>;
  _gt?: InputMaybe<Scalars['Date']['input']>;
  _gte?: InputMaybe<Scalars['Date']['input']>;
  _in?: InputMaybe<Array<Scalars['Date']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Date']['input']>;
  _lte?: InputMaybe<Scalars['Date']['input']>;
  _neq?: InputMaybe<Scalars['Date']['input']>;
  _notIn?: InputMaybe<Array<Scalars['Date']['input']>>;
};

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

export type File = {
  __typename?: 'File';
  id: Scalars['ID']['output'];
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
  /** Customers Admin mutation namespace. */
  customersMutation: CustomersMutation;
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

/** Direction in which a price adjustment changes the base price. */
export enum PriceAdjustmentOperation {
  /** Subtract the calculated value from the base price. */
  Decrease = 'DECREASE',
  /** Add the calculated value to the base price. */
  Increase = 'INCREASE'
}

/** Representation used to calculate a price adjustment. */
export enum PriceAdjustmentValueType {
  /** Use a monetary value expressed in minor currency units. */
  FixedAmount = 'FIXED_AMOUNT',
  /** Calculate the value from basis points where 10000 equals 100%. */
  Percentage = 'PERCENTAGE'
}

/** Catalog Product reference. Customers never joins the Catalog database. */
export type Product = Node & {
  __typename?: 'Product';
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Customers Admin query namespace. */
  customersQuery: CustomersQuery;
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

/** A user-facing mutation error. */
export type UserError = {
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Catalog Variant reference. Customers never joins the Catalog database. */
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


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( Customer ) | ( CustomerAddress ) | ( CustomerComparison ) | ( CustomerComparisonItem ) | ( CustomerConsent ) | ( CustomerConsentEvent ) | ( CustomerDataRequest ) | ( CustomerGroup ) | ( CustomerGroupMembership ) | ( CustomerMerge ) | ( CustomerMonetaryStatistics ) | ( CustomerSegment ) | ( CustomerSegmentMembership ) | ( CustomerTag ) | ( CustomerTagAssignment ) | ( CustomerTaxExemption ) | ( CustomerTaxIdentifier ) | ( Product ) | ( Variant );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BigIntFilter: BigIntFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BooleanFilter: BooleanFilter;
  CurrencyCode: CurrencyCode;
  Customer: ResolverTypeWrapper<Customer>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CustomerAccountStatus: CustomerAccountStatus;
  CustomerAccountStatusFilter: CustomerAccountStatusFilter;
  CustomerAccountsSettings: ResolverTypeWrapper<CustomerAccountsSettings>;
  CustomerAccountsSettingsUpdateInput: CustomerAccountsSettingsUpdateInput;
  CustomerAccountsSettingsUpdatePayload: ResolverTypeWrapper<CustomerAccountsSettingsUpdatePayload>;
  CustomerAddress: ResolverTypeWrapper<CustomerAddress>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  CustomerAddressConnection: ResolverTypeWrapper<CustomerAddressConnection>;
  CustomerAddressCreateOperationInput: CustomerAddressCreateOperationInput;
  CustomerAddressEdge: ResolverTypeWrapper<CustomerAddressEdge>;
  CustomerAddressOrderByInput: CustomerAddressOrderByInput;
  CustomerAddressOrderField: CustomerAddressOrderField;
  CustomerAddressPatchInput: CustomerAddressPatchInput;
  CustomerAddressUpdateOperationInput: CustomerAddressUpdateOperationInput;
  CustomerAddressValidationStatus: CustomerAddressValidationStatus;
  CustomerAddressValidationStatusFilter: CustomerAddressValidationStatusFilter;
  CustomerAddressWhereInput: CustomerAddressWhereInput;
  CustomerAddressesUpdateInput: CustomerAddressesUpdateInput;
  CustomerAdminLifecycleStatus: CustomerAdminLifecycleStatus;
  CustomerAssignmentSource: CustomerAssignmentSource;
  CustomerAssignmentSourceFilter: CustomerAssignmentSourceFilter;
  CustomerAuthenticationMethod: CustomerAuthenticationMethod;
  CustomerAuthenticationMethodSettings: ResolverTypeWrapper<CustomerAuthenticationMethodSettings>;
  CustomerAuthenticationProvider: CustomerAuthenticationProvider;
  CustomerAuthenticationProviderSettings: ResolverTypeWrapper<CustomerAuthenticationProviderSettings>;
  CustomerCompanyUpdateInput: CustomerCompanyUpdateInput;
  CustomerComparison: ResolverTypeWrapper<CustomerComparison>;
  CustomerComparisonItem: ResolverTypeWrapper<CustomerComparisonItem>;
  CustomerConnection: ResolverTypeWrapper<CustomerConnection>;
  CustomerConsent: ResolverTypeWrapper<CustomerConsent>;
  CustomerConsentAdminState: CustomerConsentAdminState;
  CustomerConsentChannel: CustomerConsentChannel;
  CustomerConsentEvent: ResolverTypeWrapper<CustomerConsentEvent>;
  CustomerConsentEventConnection: ResolverTypeWrapper<CustomerConsentEventConnection>;
  CustomerConsentEventEdge: ResolverTypeWrapper<CustomerConsentEventEdge>;
  CustomerConsentEventOrderByInput: CustomerConsentEventOrderByInput;
  CustomerConsentEventOrderField: CustomerConsentEventOrderField;
  CustomerConsentOptInLevel: CustomerConsentOptInLevel;
  CustomerConsentState: CustomerConsentState;
  CustomerConsentStateFilter: CustomerConsentStateFilter;
  CustomerConsentUpdateOperationInput: CustomerConsentUpdateOperationInput;
  CustomerConsentsUpdateInput: CustomerConsentsUpdateInput;
  CustomerContactUpdateInput: CustomerContactUpdateInput;
  CustomerCreateInput: CustomerCreateInput;
  CustomerCreatePayload: ResolverTypeWrapper<CustomerCreatePayload>;
  CustomerDataRequest: ResolverTypeWrapper<CustomerDataRequest>;
  CustomerDataRequestCancelOperationInput: CustomerDataRequestCancelOperationInput;
  CustomerDataRequestConnection: ResolverTypeWrapper<CustomerDataRequestConnection>;
  CustomerDataRequestCreateInput: CustomerDataRequestCreateInput;
  CustomerDataRequestCreatePayload: ResolverTypeWrapper<CustomerDataRequestCreatePayload>;
  CustomerDataRequestDeleteInput: CustomerDataRequestDeleteInput;
  CustomerDataRequestDeletePayload: ResolverTypeWrapper<CustomerDataRequestDeletePayload>;
  CustomerDataRequestEdge: ResolverTypeWrapper<CustomerDataRequestEdge>;
  CustomerDataRequestOrderByInput: CustomerDataRequestOrderByInput;
  CustomerDataRequestOrderField: CustomerDataRequestOrderField;
  CustomerDataRequestStatus: CustomerDataRequestStatus;
  CustomerDataRequestStatusFilter: CustomerDataRequestStatusFilter;
  CustomerDataRequestType: CustomerDataRequestType;
  CustomerDataRequestTypeFilter: CustomerDataRequestTypeFilter;
  CustomerDataRequestUpdateInput: CustomerDataRequestUpdateInput;
  CustomerDataRequestUpdatePayload: ResolverTypeWrapper<CustomerDataRequestUpdatePayload>;
  CustomerDataRequestWhereInput: CustomerDataRequestWhereInput;
  CustomerDeleteInput: CustomerDeleteInput;
  CustomerDeletePayload: ResolverTypeWrapper<CustomerDeletePayload>;
  CustomerEdge: ResolverTypeWrapper<CustomerEdge>;
  CustomerGroup: ResolverTypeWrapper<CustomerGroup>;
  CustomerGroupConnection: ResolverTypeWrapper<CustomerGroupConnection>;
  CustomerGroupCreateInput: CustomerGroupCreateInput;
  CustomerGroupCreatePayload: ResolverTypeWrapper<CustomerGroupCreatePayload>;
  CustomerGroupDefinitionUpdateInput: CustomerGroupDefinitionUpdateInput;
  CustomerGroupDeleteInput: CustomerGroupDeleteInput;
  CustomerGroupDeletePayload: ResolverTypeWrapper<CustomerGroupDeletePayload>;
  CustomerGroupEdge: ResolverTypeWrapper<CustomerGroupEdge>;
  CustomerGroupMembership: ResolverTypeWrapper<CustomerGroupMembership>;
  CustomerGroupMembershipConnection: ResolverTypeWrapper<CustomerGroupMembershipConnection>;
  CustomerGroupMembershipEdge: ResolverTypeWrapper<CustomerGroupMembershipEdge>;
  CustomerGroupMembershipOrderByInput: CustomerGroupMembershipOrderByInput;
  CustomerGroupMembershipOrderField: CustomerGroupMembershipOrderField;
  CustomerGroupMembershipRelationCreateInput: CustomerGroupMembershipRelationCreateInput;
  CustomerGroupMembershipRelationUpdateInput: CustomerGroupMembershipRelationUpdateInput;
  CustomerGroupMembershipRelationsUpdateInput: CustomerGroupMembershipRelationsUpdateInput;
  CustomerGroupMembershipUpdateOperationInput: CustomerGroupMembershipUpdateOperationInput;
  CustomerGroupMembershipWhereInput: CustomerGroupMembershipWhereInput;
  CustomerGroupMembershipsUpdateInput: CustomerGroupMembershipsUpdateInput;
  CustomerGroupOrderByInput: CustomerGroupOrderByInput;
  CustomerGroupOrderField: CustomerGroupOrderField;
  CustomerGroupStateUpdateInput: CustomerGroupStateUpdateInput;
  CustomerGroupUpdateInput: CustomerGroupUpdateInput;
  CustomerGroupUpdatePayload: ResolverTypeWrapper<CustomerGroupUpdatePayload>;
  CustomerGroupWhereInput: CustomerGroupWhereInput;
  CustomerLifecycleStatus: CustomerLifecycleStatus;
  CustomerLifecycleStatusFilter: CustomerLifecycleStatusFilter;
  CustomerMerge: ResolverTypeWrapper<CustomerMerge>;
  CustomerMergeConnection: ResolverTypeWrapper<CustomerMergeConnection>;
  CustomerMergeCreateInput: CustomerMergeCreateInput;
  CustomerMergeCreatePayload: ResolverTypeWrapper<CustomerMergeCreatePayload>;
  CustomerMergeDeleteInput: CustomerMergeDeleteInput;
  CustomerMergeDeletePayload: ResolverTypeWrapper<CustomerMergeDeletePayload>;
  CustomerMergeEdge: ResolverTypeWrapper<CustomerMergeEdge>;
  CustomerMergeOrderByInput: CustomerMergeOrderByInput;
  CustomerMergeOrderField: CustomerMergeOrderField;
  CustomerMergeStatus: CustomerMergeStatus;
  CustomerMergeStatusFilter: CustomerMergeStatusFilter;
  CustomerMergeUpdateInput: CustomerMergeUpdateInput;
  CustomerMergeUpdatePayload: ResolverTypeWrapper<CustomerMergeUpdatePayload>;
  CustomerMergeWhereInput: CustomerMergeWhereInput;
  CustomerModerationUpdateInput: CustomerModerationUpdateInput;
  CustomerMonetaryStatistics: ResolverTypeWrapper<CustomerMonetaryStatistics>;
  CustomerMonetaryStatisticsConnection: ResolverTypeWrapper<CustomerMonetaryStatisticsConnection>;
  CustomerMonetaryStatisticsEdge: ResolverTypeWrapper<CustomerMonetaryStatisticsEdge>;
  CustomerMonetaryStatisticsOrderByInput: CustomerMonetaryStatisticsOrderByInput;
  CustomerMonetaryStatisticsOrderField: CustomerMonetaryStatisticsOrderField;
  CustomerMonetaryStatisticsWhereInput: CustomerMonetaryStatisticsWhereInput;
  CustomerNoteUpdateInput: CustomerNoteUpdateInput;
  CustomerOperationResult: ResolverTypeWrapper<CustomerOperationResult>;
  CustomerOperationType: CustomerOperationType;
  CustomerOrderByInput: CustomerOrderByInput;
  CustomerOrderField: CustomerOrderField;
  CustomerProfileUpdateInput: CustomerProfileUpdateInput;
  CustomerSegment: ResolverTypeWrapper<CustomerSegment>;
  CustomerSegmentConnection: ResolverTypeWrapper<CustomerSegmentConnection>;
  CustomerSegmentCreateInput: CustomerSegmentCreateInput;
  CustomerSegmentCreatePayload: ResolverTypeWrapper<CustomerSegmentCreatePayload>;
  CustomerSegmentDefinitionUpdateInput: CustomerSegmentDefinitionUpdateInput;
  CustomerSegmentDeleteInput: CustomerSegmentDeleteInput;
  CustomerSegmentDeletePayload: ResolverTypeWrapper<CustomerSegmentDeletePayload>;
  CustomerSegmentDetailsUpdateInput: CustomerSegmentDetailsUpdateInput;
  CustomerSegmentEdge: ResolverTypeWrapper<CustomerSegmentEdge>;
  CustomerSegmentMembership: ResolverTypeWrapper<CustomerSegmentMembership>;
  CustomerSegmentMembershipConnection: ResolverTypeWrapper<CustomerSegmentMembershipConnection>;
  CustomerSegmentMembershipEdge: ResolverTypeWrapper<CustomerSegmentMembershipEdge>;
  CustomerSegmentMembershipOrderByInput: CustomerSegmentMembershipOrderByInput;
  CustomerSegmentMembershipOrderField: CustomerSegmentMembershipOrderField;
  CustomerSegmentMembershipRelationCreateInput: CustomerSegmentMembershipRelationCreateInput;
  CustomerSegmentMembershipRelationUpdateInput: CustomerSegmentMembershipRelationUpdateInput;
  CustomerSegmentMembershipRelationsUpdateInput: CustomerSegmentMembershipRelationsUpdateInput;
  CustomerSegmentMembershipWhereInput: CustomerSegmentMembershipWhereInput;
  CustomerSegmentMembershipsUpdateInput: CustomerSegmentMembershipsUpdateInput;
  CustomerSegmentOrderByInput: CustomerSegmentOrderByInput;
  CustomerSegmentOrderField: CustomerSegmentOrderField;
  CustomerSegmentStateUpdateInput: CustomerSegmentStateUpdateInput;
  CustomerSegmentStatus: CustomerSegmentStatus;
  CustomerSegmentStatusFilter: CustomerSegmentStatusFilter;
  CustomerSegmentType: CustomerSegmentType;
  CustomerSegmentTypeFilter: CustomerSegmentTypeFilter;
  CustomerSegmentUpdateInput: CustomerSegmentUpdateInput;
  CustomerSegmentUpdatePayload: ResolverTypeWrapper<CustomerSegmentUpdatePayload>;
  CustomerSegmentWhereInput: CustomerSegmentWhereInput;
  CustomerStatistics: ResolverTypeWrapper<CustomerStatistics>;
  CustomerStatusUpdateInput: CustomerStatusUpdateInput;
  CustomerTag: ResolverTypeWrapper<CustomerTag>;
  CustomerTagAssignment: ResolverTypeWrapper<CustomerTagAssignment>;
  CustomerTagAssignmentConnection: ResolverTypeWrapper<CustomerTagAssignmentConnection>;
  CustomerTagAssignmentEdge: ResolverTypeWrapper<CustomerTagAssignmentEdge>;
  CustomerTagAssignmentOrderByInput: CustomerTagAssignmentOrderByInput;
  CustomerTagAssignmentOrderField: CustomerTagAssignmentOrderField;
  CustomerTagAssignmentRelationCreateInput: CustomerTagAssignmentRelationCreateInput;
  CustomerTagAssignmentRelationsUpdateInput: CustomerTagAssignmentRelationsUpdateInput;
  CustomerTagAssignmentWhereInput: CustomerTagAssignmentWhereInput;
  CustomerTagAssignmentsUpdateInput: CustomerTagAssignmentsUpdateInput;
  CustomerTagConnection: ResolverTypeWrapper<CustomerTagConnection>;
  CustomerTagCreateInput: CustomerTagCreateInput;
  CustomerTagCreatePayload: ResolverTypeWrapper<CustomerTagCreatePayload>;
  CustomerTagDeleteInput: CustomerTagDeleteInput;
  CustomerTagDeletePayload: ResolverTypeWrapper<CustomerTagDeletePayload>;
  CustomerTagEdge: ResolverTypeWrapper<CustomerTagEdge>;
  CustomerTagOrderByInput: CustomerTagOrderByInput;
  CustomerTagOrderField: CustomerTagOrderField;
  CustomerTagUpdateInput: CustomerTagUpdateInput;
  CustomerTagUpdatePayload: ResolverTypeWrapper<CustomerTagUpdatePayload>;
  CustomerTagWhereInput: CustomerTagWhereInput;
  CustomerTaxExemption: ResolverTypeWrapper<CustomerTaxExemption>;
  CustomerTaxExemptionConnection: ResolverTypeWrapper<CustomerTaxExemptionConnection>;
  CustomerTaxExemptionCreateOperationInput: CustomerTaxExemptionCreateOperationInput;
  CustomerTaxExemptionEdge: ResolverTypeWrapper<CustomerTaxExemptionEdge>;
  CustomerTaxExemptionOrderByInput: CustomerTaxExemptionOrderByInput;
  CustomerTaxExemptionOrderField: CustomerTaxExemptionOrderField;
  CustomerTaxExemptionPatchInput: CustomerTaxExemptionPatchInput;
  CustomerTaxExemptionStatus: CustomerTaxExemptionStatus;
  CustomerTaxExemptionStatusFilter: CustomerTaxExemptionStatusFilter;
  CustomerTaxExemptionUpdateOperationInput: CustomerTaxExemptionUpdateOperationInput;
  CustomerTaxExemptionWhereInput: CustomerTaxExemptionWhereInput;
  CustomerTaxExemptionsUpdateInput: CustomerTaxExemptionsUpdateInput;
  CustomerTaxIdentifier: ResolverTypeWrapper<CustomerTaxIdentifier>;
  CustomerTaxIdentifierConnection: ResolverTypeWrapper<CustomerTaxIdentifierConnection>;
  CustomerTaxIdentifierCreateOperationInput: CustomerTaxIdentifierCreateOperationInput;
  CustomerTaxIdentifierEdge: ResolverTypeWrapper<CustomerTaxIdentifierEdge>;
  CustomerTaxIdentifierOrderByInput: CustomerTaxIdentifierOrderByInput;
  CustomerTaxIdentifierOrderField: CustomerTaxIdentifierOrderField;
  CustomerTaxIdentifierPatchInput: CustomerTaxIdentifierPatchInput;
  CustomerTaxIdentifierStatus: CustomerTaxIdentifierStatus;
  CustomerTaxIdentifierStatusFilter: CustomerTaxIdentifierStatusFilter;
  CustomerTaxIdentifierUpdateOperationInput: CustomerTaxIdentifierUpdateOperationInput;
  CustomerTaxIdentifierWhereInput: CustomerTaxIdentifierWhereInput;
  CustomerTaxIdentifiersUpdateInput: CustomerTaxIdentifiersUpdateInput;
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: ResolverTypeWrapper<CustomerUpdatePayload>;
  CustomerWhereInput: CustomerWhereInput;
  CustomersMutation: ResolverTypeWrapper<CustomersMutation>;
  CustomersQuery: ResolverTypeWrapper<Omit<CustomersQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateFilter: DateFilter;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  File: ResolverTypeWrapper<File>;
  FloatFilter: FloatFilter;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PriceAdjustmentOperation: PriceAdjustmentOperation;
  PriceAdjustmentValueType: PriceAdjustmentValueType;
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
  Customer: Customer;
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  ID: Scalars['ID']['output'];
  CustomerAccountStatusFilter: CustomerAccountStatusFilter;
  CustomerAccountsSettings: CustomerAccountsSettings;
  CustomerAccountsSettingsUpdateInput: CustomerAccountsSettingsUpdateInput;
  CustomerAccountsSettingsUpdatePayload: CustomerAccountsSettingsUpdatePayload;
  CustomerAddress: CustomerAddress;
  Float: Scalars['Float']['output'];
  CustomerAddressConnection: CustomerAddressConnection;
  CustomerAddressCreateOperationInput: CustomerAddressCreateOperationInput;
  CustomerAddressEdge: CustomerAddressEdge;
  CustomerAddressOrderByInput: CustomerAddressOrderByInput;
  CustomerAddressPatchInput: CustomerAddressPatchInput;
  CustomerAddressUpdateOperationInput: CustomerAddressUpdateOperationInput;
  CustomerAddressValidationStatusFilter: CustomerAddressValidationStatusFilter;
  CustomerAddressWhereInput: CustomerAddressWhereInput;
  CustomerAddressesUpdateInput: CustomerAddressesUpdateInput;
  CustomerAssignmentSourceFilter: CustomerAssignmentSourceFilter;
  CustomerAuthenticationMethodSettings: CustomerAuthenticationMethodSettings;
  CustomerAuthenticationProviderSettings: CustomerAuthenticationProviderSettings;
  CustomerCompanyUpdateInput: CustomerCompanyUpdateInput;
  CustomerComparison: CustomerComparison;
  CustomerComparisonItem: CustomerComparisonItem;
  CustomerConnection: CustomerConnection;
  CustomerConsent: CustomerConsent;
  CustomerConsentEvent: CustomerConsentEvent;
  CustomerConsentEventConnection: CustomerConsentEventConnection;
  CustomerConsentEventEdge: CustomerConsentEventEdge;
  CustomerConsentEventOrderByInput: CustomerConsentEventOrderByInput;
  CustomerConsentStateFilter: CustomerConsentStateFilter;
  CustomerConsentUpdateOperationInput: CustomerConsentUpdateOperationInput;
  CustomerConsentsUpdateInput: CustomerConsentsUpdateInput;
  CustomerContactUpdateInput: CustomerContactUpdateInput;
  CustomerCreateInput: CustomerCreateInput;
  CustomerCreatePayload: CustomerCreatePayload;
  CustomerDataRequest: CustomerDataRequest;
  CustomerDataRequestCancelOperationInput: CustomerDataRequestCancelOperationInput;
  CustomerDataRequestConnection: CustomerDataRequestConnection;
  CustomerDataRequestCreateInput: CustomerDataRequestCreateInput;
  CustomerDataRequestCreatePayload: CustomerDataRequestCreatePayload;
  CustomerDataRequestDeleteInput: CustomerDataRequestDeleteInput;
  CustomerDataRequestDeletePayload: CustomerDataRequestDeletePayload;
  CustomerDataRequestEdge: CustomerDataRequestEdge;
  CustomerDataRequestOrderByInput: CustomerDataRequestOrderByInput;
  CustomerDataRequestStatusFilter: CustomerDataRequestStatusFilter;
  CustomerDataRequestTypeFilter: CustomerDataRequestTypeFilter;
  CustomerDataRequestUpdateInput: CustomerDataRequestUpdateInput;
  CustomerDataRequestUpdatePayload: CustomerDataRequestUpdatePayload;
  CustomerDataRequestWhereInput: CustomerDataRequestWhereInput;
  CustomerDeleteInput: CustomerDeleteInput;
  CustomerDeletePayload: CustomerDeletePayload;
  CustomerEdge: CustomerEdge;
  CustomerGroup: CustomerGroup;
  CustomerGroupConnection: CustomerGroupConnection;
  CustomerGroupCreateInput: CustomerGroupCreateInput;
  CustomerGroupCreatePayload: CustomerGroupCreatePayload;
  CustomerGroupDefinitionUpdateInput: CustomerGroupDefinitionUpdateInput;
  CustomerGroupDeleteInput: CustomerGroupDeleteInput;
  CustomerGroupDeletePayload: CustomerGroupDeletePayload;
  CustomerGroupEdge: CustomerGroupEdge;
  CustomerGroupMembership: CustomerGroupMembership;
  CustomerGroupMembershipConnection: CustomerGroupMembershipConnection;
  CustomerGroupMembershipEdge: CustomerGroupMembershipEdge;
  CustomerGroupMembershipOrderByInput: CustomerGroupMembershipOrderByInput;
  CustomerGroupMembershipRelationCreateInput: CustomerGroupMembershipRelationCreateInput;
  CustomerGroupMembershipRelationUpdateInput: CustomerGroupMembershipRelationUpdateInput;
  CustomerGroupMembershipRelationsUpdateInput: CustomerGroupMembershipRelationsUpdateInput;
  CustomerGroupMembershipUpdateOperationInput: CustomerGroupMembershipUpdateOperationInput;
  CustomerGroupMembershipWhereInput: CustomerGroupMembershipWhereInput;
  CustomerGroupMembershipsUpdateInput: CustomerGroupMembershipsUpdateInput;
  CustomerGroupOrderByInput: CustomerGroupOrderByInput;
  CustomerGroupStateUpdateInput: CustomerGroupStateUpdateInput;
  CustomerGroupUpdateInput: CustomerGroupUpdateInput;
  CustomerGroupUpdatePayload: CustomerGroupUpdatePayload;
  CustomerGroupWhereInput: CustomerGroupWhereInput;
  CustomerLifecycleStatusFilter: CustomerLifecycleStatusFilter;
  CustomerMerge: CustomerMerge;
  CustomerMergeConnection: CustomerMergeConnection;
  CustomerMergeCreateInput: CustomerMergeCreateInput;
  CustomerMergeCreatePayload: CustomerMergeCreatePayload;
  CustomerMergeDeleteInput: CustomerMergeDeleteInput;
  CustomerMergeDeletePayload: CustomerMergeDeletePayload;
  CustomerMergeEdge: CustomerMergeEdge;
  CustomerMergeOrderByInput: CustomerMergeOrderByInput;
  CustomerMergeStatusFilter: CustomerMergeStatusFilter;
  CustomerMergeUpdateInput: CustomerMergeUpdateInput;
  CustomerMergeUpdatePayload: CustomerMergeUpdatePayload;
  CustomerMergeWhereInput: CustomerMergeWhereInput;
  CustomerModerationUpdateInput: CustomerModerationUpdateInput;
  CustomerMonetaryStatistics: CustomerMonetaryStatistics;
  CustomerMonetaryStatisticsConnection: CustomerMonetaryStatisticsConnection;
  CustomerMonetaryStatisticsEdge: CustomerMonetaryStatisticsEdge;
  CustomerMonetaryStatisticsOrderByInput: CustomerMonetaryStatisticsOrderByInput;
  CustomerMonetaryStatisticsWhereInput: CustomerMonetaryStatisticsWhereInput;
  CustomerNoteUpdateInput: CustomerNoteUpdateInput;
  CustomerOperationResult: CustomerOperationResult;
  CustomerOrderByInput: CustomerOrderByInput;
  CustomerProfileUpdateInput: CustomerProfileUpdateInput;
  CustomerSegment: CustomerSegment;
  CustomerSegmentConnection: CustomerSegmentConnection;
  CustomerSegmentCreateInput: CustomerSegmentCreateInput;
  CustomerSegmentCreatePayload: CustomerSegmentCreatePayload;
  CustomerSegmentDefinitionUpdateInput: CustomerSegmentDefinitionUpdateInput;
  CustomerSegmentDeleteInput: CustomerSegmentDeleteInput;
  CustomerSegmentDeletePayload: CustomerSegmentDeletePayload;
  CustomerSegmentDetailsUpdateInput: CustomerSegmentDetailsUpdateInput;
  CustomerSegmentEdge: CustomerSegmentEdge;
  CustomerSegmentMembership: CustomerSegmentMembership;
  CustomerSegmentMembershipConnection: CustomerSegmentMembershipConnection;
  CustomerSegmentMembershipEdge: CustomerSegmentMembershipEdge;
  CustomerSegmentMembershipOrderByInput: CustomerSegmentMembershipOrderByInput;
  CustomerSegmentMembershipRelationCreateInput: CustomerSegmentMembershipRelationCreateInput;
  CustomerSegmentMembershipRelationUpdateInput: CustomerSegmentMembershipRelationUpdateInput;
  CustomerSegmentMembershipRelationsUpdateInput: CustomerSegmentMembershipRelationsUpdateInput;
  CustomerSegmentMembershipWhereInput: CustomerSegmentMembershipWhereInput;
  CustomerSegmentMembershipsUpdateInput: CustomerSegmentMembershipsUpdateInput;
  CustomerSegmentOrderByInput: CustomerSegmentOrderByInput;
  CustomerSegmentStateUpdateInput: CustomerSegmentStateUpdateInput;
  CustomerSegmentStatusFilter: CustomerSegmentStatusFilter;
  CustomerSegmentTypeFilter: CustomerSegmentTypeFilter;
  CustomerSegmentUpdateInput: CustomerSegmentUpdateInput;
  CustomerSegmentUpdatePayload: CustomerSegmentUpdatePayload;
  CustomerSegmentWhereInput: CustomerSegmentWhereInput;
  CustomerStatistics: CustomerStatistics;
  CustomerStatusUpdateInput: CustomerStatusUpdateInput;
  CustomerTag: CustomerTag;
  CustomerTagAssignment: CustomerTagAssignment;
  CustomerTagAssignmentConnection: CustomerTagAssignmentConnection;
  CustomerTagAssignmentEdge: CustomerTagAssignmentEdge;
  CustomerTagAssignmentOrderByInput: CustomerTagAssignmentOrderByInput;
  CustomerTagAssignmentRelationCreateInput: CustomerTagAssignmentRelationCreateInput;
  CustomerTagAssignmentRelationsUpdateInput: CustomerTagAssignmentRelationsUpdateInput;
  CustomerTagAssignmentWhereInput: CustomerTagAssignmentWhereInput;
  CustomerTagAssignmentsUpdateInput: CustomerTagAssignmentsUpdateInput;
  CustomerTagConnection: CustomerTagConnection;
  CustomerTagCreateInput: CustomerTagCreateInput;
  CustomerTagCreatePayload: CustomerTagCreatePayload;
  CustomerTagDeleteInput: CustomerTagDeleteInput;
  CustomerTagDeletePayload: CustomerTagDeletePayload;
  CustomerTagEdge: CustomerTagEdge;
  CustomerTagOrderByInput: CustomerTagOrderByInput;
  CustomerTagUpdateInput: CustomerTagUpdateInput;
  CustomerTagUpdatePayload: CustomerTagUpdatePayload;
  CustomerTagWhereInput: CustomerTagWhereInput;
  CustomerTaxExemption: CustomerTaxExemption;
  CustomerTaxExemptionConnection: CustomerTaxExemptionConnection;
  CustomerTaxExemptionCreateOperationInput: CustomerTaxExemptionCreateOperationInput;
  CustomerTaxExemptionEdge: CustomerTaxExemptionEdge;
  CustomerTaxExemptionOrderByInput: CustomerTaxExemptionOrderByInput;
  CustomerTaxExemptionPatchInput: CustomerTaxExemptionPatchInput;
  CustomerTaxExemptionStatusFilter: CustomerTaxExemptionStatusFilter;
  CustomerTaxExemptionUpdateOperationInput: CustomerTaxExemptionUpdateOperationInput;
  CustomerTaxExemptionWhereInput: CustomerTaxExemptionWhereInput;
  CustomerTaxExemptionsUpdateInput: CustomerTaxExemptionsUpdateInput;
  CustomerTaxIdentifier: CustomerTaxIdentifier;
  CustomerTaxIdentifierConnection: CustomerTaxIdentifierConnection;
  CustomerTaxIdentifierCreateOperationInput: CustomerTaxIdentifierCreateOperationInput;
  CustomerTaxIdentifierEdge: CustomerTaxIdentifierEdge;
  CustomerTaxIdentifierOrderByInput: CustomerTaxIdentifierOrderByInput;
  CustomerTaxIdentifierPatchInput: CustomerTaxIdentifierPatchInput;
  CustomerTaxIdentifierStatusFilter: CustomerTaxIdentifierStatusFilter;
  CustomerTaxIdentifierUpdateOperationInput: CustomerTaxIdentifierUpdateOperationInput;
  CustomerTaxIdentifierWhereInput: CustomerTaxIdentifierWhereInput;
  CustomerTaxIdentifiersUpdateInput: CustomerTaxIdentifiersUpdateInput;
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: CustomerUpdatePayload;
  CustomerWhereInput: CustomerWhereInput;
  CustomersMutation: CustomersMutation;
  CustomersQuery: Omit<CustomersQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  Date: Scalars['Date']['output'];
  DateFilter: DateFilter;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Email: Scalars['Email']['output'];
  File: File;
  FloatFilter: FloatFilter;
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Product: Product;
  Query: {};
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  Variant: Variant;
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  accountStatus?: Resolver<ResolversTypes['CustomerAccountStatus'], ParentType, ContextType>;
  addresses?: Resolver<ResolversTypes['CustomerAddressConnection'], ParentType, ContextType, Partial<CustomerAddressesArgs>>;
  blockedReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  comparison?: Resolver<Maybe<ResolversTypes['CustomerComparison']>, ParentType, ContextType>;
  consents?: Resolver<Array<ResolversTypes['CustomerConsent']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdByUserId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dateOfBirth?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  defaultBillingAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  defaultShippingAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['Email']>, ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  gender?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  groupMemberships?: Resolver<ResolversTypes['CustomerGroupMembershipConnection'], ParentType, ContextType, Partial<CustomerGroupMembershipsArgs>>;
  iamPrincipalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jobTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastActivityAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lifecycleStatus?: Resolver<ResolversTypes['CustomerLifecycleStatus'], ParentType, ContextType>;
  mergedInto?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  moderationNote?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  monetaryStatistics?: Resolver<ResolversTypes['CustomerMonetaryStatisticsConnection'], ParentType, ContextType, Partial<CustomerMonetaryStatisticsArgs>>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneE164?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  preferredLocale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prefix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  redactedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  segmentMemberships?: Resolver<ResolversTypes['CustomerSegmentMembershipConnection'], ParentType, ContextType, Partial<CustomerSegmentMembershipsArgs>>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  statistics?: Resolver<Maybe<ResolversTypes['CustomerStatistics']>, ParentType, ContextType>;
  suffix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tagAssignments?: Resolver<ResolversTypes['CustomerTagAssignmentConnection'], ParentType, ContextType, Partial<CustomerTagAssignmentsArgs>>;
  taxExemptions?: Resolver<ResolversTypes['CustomerTaxExemptionConnection'], ParentType, ContextType, Partial<CustomerTaxExemptionsArgs>>;
  taxIdentifiers?: Resolver<ResolversTypes['CustomerTaxIdentifierConnection'], ParentType, ContextType, Partial<CustomerTaxIdentifiersArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAccountsSettingsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAccountsSettings'] = ResolversParentTypes['CustomerAccountsSettings']> = ResolversObject<{
  methods?: Resolver<Array<ResolversTypes['CustomerAuthenticationMethodSettings']>, ParentType, ContextType>;
  providers?: Resolver<Array<ResolversTypes['CustomerAuthenticationProviderSettings']>, ParentType, ContextType>;
  realmEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  registrationMode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAccountsSettingsUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAccountsSettingsUpdatePayload'] = ResolversParentTypes['CustomerAccountsSettingsUpdatePayload']> = ResolversObject<{
  settings?: Resolver<Maybe<ResolversTypes['CustomerAccountsSettings']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddress'] = ResolversParentTypes['CustomerAddress']> = ResolversObject<{
  address1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  address2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  countryCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefaultBilling?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDefaultShipping?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  latitude?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  longitude?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneE164?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  postalCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prefix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  regionCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  regionName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  suffix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  validationStatus?: Resolver<ResolversTypes['CustomerAddressValidationStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressConnection'] = ResolversParentTypes['CustomerAddressConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerAddressEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressEdge'] = ResolversParentTypes['CustomerAddressEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerAddress'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAuthenticationMethodSettingsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAuthenticationMethodSettings'] = ResolversParentTypes['CustomerAuthenticationMethodSettings']> = ResolversObject<{
  configured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  method?: Resolver<ResolversTypes['CustomerAuthenticationMethod'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAuthenticationProviderSettingsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAuthenticationProviderSettings'] = ResolversParentTypes['CustomerAuthenticationProviderSettings']> = ResolversObject<{
  configured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['CustomerAuthenticationProvider'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerComparisonResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerComparison'] = ResolversParentTypes['CustomerComparison']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerComparison']>, { __typename: 'CustomerComparison' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['CustomerComparisonItem']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerComparisonItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerComparisonItem'] = ResolversParentTypes['CustomerComparisonItem']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerComparisonItem']>, { __typename: 'CustomerComparisonItem' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  addedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  comparison?: Resolver<ResolversTypes['CustomerComparison'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  variantId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConnection'] = ResolversParentTypes['CustomerConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsent'] = ResolversParentTypes['CustomerConsent']> = ResolversObject<{
  channel?: Resolver<ResolversTypes['CustomerConsentChannel'], ParentType, ContextType>;
  consentedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  contactPoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  events?: Resolver<ResolversTypes['CustomerConsentEventConnection'], ParentType, ContextType, Partial<CustomerConsentEventsArgs>>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optInLevel?: Resolver<ResolversTypes['CustomerConsentOptInLevel'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceIp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceLocationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  state?: Resolver<ResolversTypes['CustomerConsentState'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  withdrawnAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentEventResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsentEvent'] = ResolversParentTypes['CustomerConsentEvent']> = ResolversObject<{
  actorId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  channel?: Resolver<ResolversTypes['CustomerConsentChannel'], ParentType, ContextType>;
  consent?: Resolver<ResolversTypes['CustomerConsent'], ParentType, ContextType>;
  contactPoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  evidence?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  newState?: Resolver<ResolversTypes['CustomerConsentState'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  optInLevel?: Resolver<ResolversTypes['CustomerConsentOptInLevel'], ParentType, ContextType>;
  previousState?: Resolver<Maybe<ResolversTypes['CustomerConsentState']>, ParentType, ContextType>;
  requestId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceIp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourceLocationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentEventConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsentEventConnection'] = ResolversParentTypes['CustomerConsentEventConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerConsentEventEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConsentEventEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConsentEventEdge'] = ResolversParentTypes['CustomerConsentEventEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerConsentEvent'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerCreatePayload'] = ResolversParentTypes['CustomerCreatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequest'] = ResolversParentTypes['CustomerDataRequest']> = ResolversObject<{
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  dueAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  legalBasis?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rejectionReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestMetadata?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  requestedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedByType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resultFile?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  resultFileId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerDataRequestStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CustomerDataRequestType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestConnection'] = ResolversParentTypes['CustomerDataRequestConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerDataRequestEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestCreatePayload'] = ResolversParentTypes['CustomerDataRequestCreatePayload']> = ResolversObject<{
  dataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestDeletePayload'] = ResolversParentTypes['CustomerDataRequestDeletePayload']> = ResolversObject<{
  deletedDataRequestId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestEdge'] = ResolversParentTypes['CustomerDataRequestEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerDataRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestUpdatePayload'] = ResolversParentTypes['CustomerDataRequestUpdatePayload']> = ResolversObject<{
  dataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDeletePayload'] = ResolversParentTypes['CustomerDeletePayload']> = ResolversObject<{
  deletedCustomerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerEdge'] = ResolversParentTypes['CustomerEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroup'] = ResolversParentTypes['CustomerGroup']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customerMemberships?: Resolver<ResolversTypes['CustomerGroupMembershipConnection'], ParentType, ContextType, Partial<CustomerGroupCustomerMembershipsArgs>>;
  customersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupConnection'] = ResolversParentTypes['CustomerGroupConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerGroupEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupCreatePayload'] = ResolversParentTypes['CustomerGroupCreatePayload']> = ResolversObject<{
  group?: Resolver<Maybe<ResolversTypes['CustomerGroup']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupDeletePayload'] = ResolversParentTypes['CustomerGroupDeletePayload']> = ResolversObject<{
  deletedGroupId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupEdge'] = ResolversParentTypes['CustomerGroupEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerGroup'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembership'] = ResolversParentTypes['CustomerGroupMembership']> = ResolversObject<{
  assignedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  assignedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  group?: Resolver<ResolversTypes['CustomerGroup'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['CustomerAssignmentSource'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembershipConnection'] = ResolversParentTypes['CustomerGroupMembershipConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerGroupMembershipEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupMembershipEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupMembershipEdge'] = ResolversParentTypes['CustomerGroupMembershipEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerGroupMembership'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerGroupUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerGroupUpdatePayload'] = ResolversParentTypes['CustomerGroupUpdatePayload']> = ResolversObject<{
  group?: Resolver<Maybe<ResolversTypes['CustomerGroup']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMerge'] = ResolversParentTypes['CustomerMerge']> = ResolversObject<{
  errorCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  idempotencyKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  requestedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedByType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  resolution?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  sourceCustomer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerMergeStatus'], ParentType, ContextType>;
  targetCustomer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeConnection'] = ResolversParentTypes['CustomerMergeConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerMergeEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeCreatePayload'] = ResolversParentTypes['CustomerMergeCreatePayload']> = ResolversObject<{
  merge?: Resolver<Maybe<ResolversTypes['CustomerMerge']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeDeletePayload'] = ResolversParentTypes['CustomerMergeDeletePayload']> = ResolversObject<{
  deletedMergeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeEdge'] = ResolversParentTypes['CustomerMergeEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerMerge'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMergeUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMergeUpdatePayload'] = ResolversParentTypes['CustomerMergeUpdatePayload']> = ResolversObject<{
  merge?: Resolver<Maybe<ResolversTypes['CustomerMerge']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMonetaryStatisticsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMonetaryStatistics'] = ResolversParentTypes['CustomerMonetaryStatistics']> = ResolversObject<{
  averageOrderValueMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  netSpentMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  ordersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalRefundedMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  totalSpentMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMonetaryStatisticsConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMonetaryStatisticsConnection'] = ResolversParentTypes['CustomerMonetaryStatisticsConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerMonetaryStatisticsEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMonetaryStatisticsEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMonetaryStatisticsEdge'] = ResolversParentTypes['CustomerMonetaryStatisticsEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerMonetaryStatistics'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerOperationResult'] = ResolversParentTypes['CustomerOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CustomerOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegment'] = ResolversParentTypes['CustomerSegment']> = ResolversObject<{
  color?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  customerMemberships?: Resolver<ResolversTypes['CustomerSegmentMembershipConnection'], ParentType, ContextType, Partial<CustomerSegmentCustomerMembershipsArgs>>;
  customersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  definition?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  query?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerSegmentStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CustomerSegmentType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentConnection'] = ResolversParentTypes['CustomerSegmentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerSegmentEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentCreatePayload'] = ResolversParentTypes['CustomerSegmentCreatePayload']> = ResolversObject<{
  segment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentDeletePayload'] = ResolversParentTypes['CustomerSegmentDeletePayload']> = ResolversObject<{
  deletedSegmentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentEdge'] = ResolversParentTypes['CustomerSegmentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerSegment'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentMembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentMembership'] = ResolversParentTypes['CustomerSegmentMembership']> = ResolversObject<{
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  evaluatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  segment?: Resolver<ResolversTypes['CustomerSegment'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['CustomerAssignmentSource'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentMembershipConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentMembershipConnection'] = ResolversParentTypes['CustomerSegmentMembershipConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerSegmentMembershipEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentMembershipEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentMembershipEdge'] = ResolversParentTypes['CustomerSegmentMembershipEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerSegmentMembership'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerSegmentUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerSegmentUpdatePayload'] = ResolversParentTypes['CustomerSegmentUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  segment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerStatisticsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerStatistics'] = ResolversParentTypes['CustomerStatistics']> = ResolversObject<{
  cancelledOrdersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedOrdersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  firstOrderAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  firstOrderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  lastCheckoutAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastOrderAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastOrderId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  ordersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  returnsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTag'] = ResolversParentTypes['CustomerTag']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customerAssignments?: Resolver<ResolversTypes['CustomerTagAssignmentConnection'], ParentType, ContextType, Partial<CustomerTagCustomerAssignmentsArgs>>;
  customersCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  normalizedName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagAssignmentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagAssignment'] = ResolversParentTypes['CustomerTagAssignment']> = ResolversObject<{
  assignedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  assignedById?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  tag?: Resolver<ResolversTypes['CustomerTag'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagAssignmentConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagAssignmentConnection'] = ResolversParentTypes['CustomerTagAssignmentConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTagAssignmentEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagAssignmentEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagAssignmentEdge'] = ResolversParentTypes['CustomerTagAssignmentEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTagAssignment'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagConnection'] = ResolversParentTypes['CustomerTagConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTagEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagCreatePayload'] = ResolversParentTypes['CustomerTagCreatePayload']> = ResolversObject<{
  tag?: Resolver<Maybe<ResolversTypes['CustomerTag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagDeletePayload'] = ResolversParentTypes['CustomerTagDeletePayload']> = ResolversObject<{
  deletedTagId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagEdge'] = ResolversParentTypes['CustomerTagEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTag'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTagUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTagUpdatePayload'] = ResolversParentTypes['CustomerTagUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  tag?: Resolver<Maybe<ResolversTypes['CustomerTag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemption'] = ResolversParentTypes['CustomerTaxExemption']> = ResolversObject<{
  certificateFile?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  certificateFileId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  countryCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  regionCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerTaxExemptionStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validFrom?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  validTo?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionConnection'] = ResolversParentTypes['CustomerTaxExemptionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTaxExemptionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionEdge'] = ResolversParentTypes['CustomerTaxExemptionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTaxExemption'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifier'] = ResolversParentTypes['CustomerTaxIdentifier']> = ResolversObject<{
  countryCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  identifierType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  normalizedValue?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerTaxIdentifierStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validFrom?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  validTo?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verifiedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierConnection'] = ResolversParentTypes['CustomerTaxIdentifierConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerTaxIdentifierEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierEdge'] = ResolversParentTypes['CustomerTaxIdentifierEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTaxIdentifier'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerUpdatePayload'] = ResolversParentTypes['CustomerUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['CustomerOperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomersMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomersMutation'] = ResolversParentTypes['CustomersMutation']> = ResolversObject<{
  customerAccountsSettingsUpdate?: Resolver<ResolversTypes['CustomerAccountsSettingsUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerAccountsSettingsUpdateArgs, 'input'>>;
  customerCreate?: Resolver<ResolversTypes['CustomerCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerCreateArgs, 'input'>>;
  customerDataRequestCreate?: Resolver<ResolversTypes['CustomerDataRequestCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerDataRequestCreateArgs, 'input'>>;
  customerDataRequestDelete?: Resolver<ResolversTypes['CustomerDataRequestDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerDataRequestDeleteArgs, 'input'>>;
  customerDataRequestUpdate?: Resolver<ResolversTypes['CustomerDataRequestUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerDataRequestUpdateArgs, 'dataRequestId'>>;
  customerDelete?: Resolver<ResolversTypes['CustomerDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerDeleteArgs, 'input'>>;
  customerGroupCreate?: Resolver<ResolversTypes['CustomerGroupCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupCreateArgs, 'input'>>;
  customerGroupDelete?: Resolver<ResolversTypes['CustomerGroupDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupDeleteArgs, 'input'>>;
  customerGroupUpdate?: Resolver<ResolversTypes['CustomerGroupUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerGroupUpdateArgs, 'expectedRevision' | 'groupId' | 'operations'>>;
  customerMergeCreate?: Resolver<ResolversTypes['CustomerMergeCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerMergeCreateArgs, 'input'>>;
  customerMergeDelete?: Resolver<ResolversTypes['CustomerMergeDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerMergeDeleteArgs, 'input'>>;
  customerMergeUpdate?: Resolver<ResolversTypes['CustomerMergeUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerMergeUpdateArgs, 'mergeId'>>;
  customerSegmentCreate?: Resolver<ResolversTypes['CustomerSegmentCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentCreateArgs, 'input'>>;
  customerSegmentDelete?: Resolver<ResolversTypes['CustomerSegmentDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentDeleteArgs, 'input'>>;
  customerSegmentUpdate?: Resolver<ResolversTypes['CustomerSegmentUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerSegmentUpdateArgs, 'expectedRevision' | 'operations' | 'segmentId'>>;
  customerTagCreate?: Resolver<ResolversTypes['CustomerTagCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagCreateArgs, 'input'>>;
  customerTagDelete?: Resolver<ResolversTypes['CustomerTagDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagDeleteArgs, 'input'>>;
  customerTagUpdate?: Resolver<ResolversTypes['CustomerTagUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerTagUpdateArgs, 'tagId'>>;
  customerUpdate?: Resolver<ResolversTypes['CustomerUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerUpdateArgs, 'customerId' | 'expectedRevision' | 'operations'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomersQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomersQuery'] = ResolversParentTypes['CustomersQuery']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerArgs, 'id'>>;
  customerAccountsSettings?: Resolver<Maybe<ResolversTypes['CustomerAccountsSettings']>, ParentType, ContextType>;
  customerAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerAddressArgs, 'id'>>;
  customerByEmail?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerByEmailArgs, 'email'>>;
  customerConsent?: Resolver<Maybe<ResolversTypes['CustomerConsent']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerConsentArgs, 'id'>>;
  customerDataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerDataRequestArgs, 'id'>>;
  customerDataRequests?: Resolver<ResolversTypes['CustomerDataRequestConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerDataRequestsArgs>>;
  customerGroup?: Resolver<Maybe<ResolversTypes['CustomerGroup']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerGroupArgs, 'id'>>;
  customerGroups?: Resolver<ResolversTypes['CustomerGroupConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerGroupsArgs>>;
  customerMerge?: Resolver<Maybe<ResolversTypes['CustomerMerge']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerMergeArgs, 'id'>>;
  customerMerges?: Resolver<ResolversTypes['CustomerMergeConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerMergesArgs>>;
  customerSegment?: Resolver<Maybe<ResolversTypes['CustomerSegment']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerSegmentArgs, 'id'>>;
  customerSegments?: Resolver<ResolversTypes['CustomerSegmentConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerSegmentsArgs>>;
  customerTag?: Resolver<Maybe<ResolversTypes['CustomerTag']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerTagArgs, 'id'>>;
  customerTags?: Resolver<ResolversTypes['CustomerTagConnection'], ParentType, ContextType, Partial<CustomersQueryCustomerTagsArgs>>;
  customerTaxExemption?: Resolver<Maybe<ResolversTypes['CustomerTaxExemption']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerTaxExemptionArgs, 'id'>>;
  customerTaxIdentifier?: Resolver<Maybe<ResolversTypes['CustomerTaxIdentifier']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerTaxIdentifierArgs, 'id'>>;
  customers?: Resolver<ResolversTypes['CustomerConnection'], ParentType, ContextType, Partial<CustomersQueryCustomersArgs>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<CustomersQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<CustomersQueryNodesArgs, 'ids'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type FileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['File'] = ResolversParentTypes['File']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;

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
  customersMutation?: Resolver<ResolversTypes['CustomersMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Customer' | 'CustomerAddress' | 'CustomerComparison' | 'CustomerComparisonItem' | 'CustomerConsent' | 'CustomerConsentEvent' | 'CustomerDataRequest' | 'CustomerGroup' | 'CustomerGroupMembership' | 'CustomerMerge' | 'CustomerMonetaryStatistics' | 'CustomerSegment' | 'CustomerSegmentMembership' | 'CustomerTag' | 'CustomerTagAssignment' | 'CustomerTaxExemption' | 'CustomerTaxIdentifier' | 'Product' | 'Variant', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  customersQuery?: Resolver<ResolversTypes['CustomersQuery'], ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Variant'] = ResolversParentTypes['Variant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  Customer?: CustomerResolvers<ContextType>;
  CustomerAccountsSettings?: CustomerAccountsSettingsResolvers<ContextType>;
  CustomerAccountsSettingsUpdatePayload?: CustomerAccountsSettingsUpdatePayloadResolvers<ContextType>;
  CustomerAddress?: CustomerAddressResolvers<ContextType>;
  CustomerAddressConnection?: CustomerAddressConnectionResolvers<ContextType>;
  CustomerAddressEdge?: CustomerAddressEdgeResolvers<ContextType>;
  CustomerAuthenticationMethodSettings?: CustomerAuthenticationMethodSettingsResolvers<ContextType>;
  CustomerAuthenticationProviderSettings?: CustomerAuthenticationProviderSettingsResolvers<ContextType>;
  CustomerComparison?: CustomerComparisonResolvers<ContextType>;
  CustomerComparisonItem?: CustomerComparisonItemResolvers<ContextType>;
  CustomerConnection?: CustomerConnectionResolvers<ContextType>;
  CustomerConsent?: CustomerConsentResolvers<ContextType>;
  CustomerConsentEvent?: CustomerConsentEventResolvers<ContextType>;
  CustomerConsentEventConnection?: CustomerConsentEventConnectionResolvers<ContextType>;
  CustomerConsentEventEdge?: CustomerConsentEventEdgeResolvers<ContextType>;
  CustomerCreatePayload?: CustomerCreatePayloadResolvers<ContextType>;
  CustomerDataRequest?: CustomerDataRequestResolvers<ContextType>;
  CustomerDataRequestConnection?: CustomerDataRequestConnectionResolvers<ContextType>;
  CustomerDataRequestCreatePayload?: CustomerDataRequestCreatePayloadResolvers<ContextType>;
  CustomerDataRequestDeletePayload?: CustomerDataRequestDeletePayloadResolvers<ContextType>;
  CustomerDataRequestEdge?: CustomerDataRequestEdgeResolvers<ContextType>;
  CustomerDataRequestUpdatePayload?: CustomerDataRequestUpdatePayloadResolvers<ContextType>;
  CustomerDeletePayload?: CustomerDeletePayloadResolvers<ContextType>;
  CustomerEdge?: CustomerEdgeResolvers<ContextType>;
  CustomerGroup?: CustomerGroupResolvers<ContextType>;
  CustomerGroupConnection?: CustomerGroupConnectionResolvers<ContextType>;
  CustomerGroupCreatePayload?: CustomerGroupCreatePayloadResolvers<ContextType>;
  CustomerGroupDeletePayload?: CustomerGroupDeletePayloadResolvers<ContextType>;
  CustomerGroupEdge?: CustomerGroupEdgeResolvers<ContextType>;
  CustomerGroupMembership?: CustomerGroupMembershipResolvers<ContextType>;
  CustomerGroupMembershipConnection?: CustomerGroupMembershipConnectionResolvers<ContextType>;
  CustomerGroupMembershipEdge?: CustomerGroupMembershipEdgeResolvers<ContextType>;
  CustomerGroupUpdatePayload?: CustomerGroupUpdatePayloadResolvers<ContextType>;
  CustomerMerge?: CustomerMergeResolvers<ContextType>;
  CustomerMergeConnection?: CustomerMergeConnectionResolvers<ContextType>;
  CustomerMergeCreatePayload?: CustomerMergeCreatePayloadResolvers<ContextType>;
  CustomerMergeDeletePayload?: CustomerMergeDeletePayloadResolvers<ContextType>;
  CustomerMergeEdge?: CustomerMergeEdgeResolvers<ContextType>;
  CustomerMergeUpdatePayload?: CustomerMergeUpdatePayloadResolvers<ContextType>;
  CustomerMonetaryStatistics?: CustomerMonetaryStatisticsResolvers<ContextType>;
  CustomerMonetaryStatisticsConnection?: CustomerMonetaryStatisticsConnectionResolvers<ContextType>;
  CustomerMonetaryStatisticsEdge?: CustomerMonetaryStatisticsEdgeResolvers<ContextType>;
  CustomerOperationResult?: CustomerOperationResultResolvers<ContextType>;
  CustomerSegment?: CustomerSegmentResolvers<ContextType>;
  CustomerSegmentConnection?: CustomerSegmentConnectionResolvers<ContextType>;
  CustomerSegmentCreatePayload?: CustomerSegmentCreatePayloadResolvers<ContextType>;
  CustomerSegmentDeletePayload?: CustomerSegmentDeletePayloadResolvers<ContextType>;
  CustomerSegmentEdge?: CustomerSegmentEdgeResolvers<ContextType>;
  CustomerSegmentMembership?: CustomerSegmentMembershipResolvers<ContextType>;
  CustomerSegmentMembershipConnection?: CustomerSegmentMembershipConnectionResolvers<ContextType>;
  CustomerSegmentMembershipEdge?: CustomerSegmentMembershipEdgeResolvers<ContextType>;
  CustomerSegmentUpdatePayload?: CustomerSegmentUpdatePayloadResolvers<ContextType>;
  CustomerStatistics?: CustomerStatisticsResolvers<ContextType>;
  CustomerTag?: CustomerTagResolvers<ContextType>;
  CustomerTagAssignment?: CustomerTagAssignmentResolvers<ContextType>;
  CustomerTagAssignmentConnection?: CustomerTagAssignmentConnectionResolvers<ContextType>;
  CustomerTagAssignmentEdge?: CustomerTagAssignmentEdgeResolvers<ContextType>;
  CustomerTagConnection?: CustomerTagConnectionResolvers<ContextType>;
  CustomerTagCreatePayload?: CustomerTagCreatePayloadResolvers<ContextType>;
  CustomerTagDeletePayload?: CustomerTagDeletePayloadResolvers<ContextType>;
  CustomerTagEdge?: CustomerTagEdgeResolvers<ContextType>;
  CustomerTagUpdatePayload?: CustomerTagUpdatePayloadResolvers<ContextType>;
  CustomerTaxExemption?: CustomerTaxExemptionResolvers<ContextType>;
  CustomerTaxExemptionConnection?: CustomerTaxExemptionConnectionResolvers<ContextType>;
  CustomerTaxExemptionEdge?: CustomerTaxExemptionEdgeResolvers<ContextType>;
  CustomerTaxIdentifier?: CustomerTaxIdentifierResolvers<ContextType>;
  CustomerTaxIdentifierConnection?: CustomerTaxIdentifierConnectionResolvers<ContextType>;
  CustomerTaxIdentifierEdge?: CustomerTaxIdentifierEdgeResolvers<ContextType>;
  CustomerUpdatePayload?: CustomerUpdatePayloadResolvers<ContextType>;
  CustomersMutation?: CustomersMutationResolvers<ContextType>;
  CustomersQuery?: CustomersQueryResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  Variant?: VariantResolvers<ContextType>;
}>;

