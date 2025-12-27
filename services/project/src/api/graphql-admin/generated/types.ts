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
  /** ISO 8601 date-time string */
  DateTime: { input: any; output: any; }
  /** Valid email address */
  Email: { input: any; output: any; }
  /** Unix timestamp in milliseconds */
  Timestamp: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

/** API key for programmatic access to the project */
export type ApiKey = {
  __typename?: 'ApiKey';
  /** Timestamp when the API key was created */
  createdAt: Scalars['DateTime']['output'];
  /** ID of the user who created this API key */
  createdById: Scalars['ID']['output'];
  /** Optional expiration date for the API key */
  dueDate: Maybe<Scalars['DateTime']['output']>;
  /** Unique identifier of the API key */
  id: Scalars['ID']['output'];
  /** Whether the API key has been banned by the system */
  isBanned: Scalars['Boolean']['output'];
  /** The API key value (only shown once upon creation) */
  key: Scalars['String']['output'];
  /** Timestamp of the last API call using this key */
  lastUsedAt: Maybe<Scalars['DateTime']['output']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['output'];
  /** Timestamp when the API key was revoked, null if still active */
  revokedAt: Maybe<Scalars['DateTime']['output']>;
};

/** Payload returned after an API key action (revoke) */
export type ApiKeyActionPayload = {
  __typename?: 'ApiKeyActionPayload';
  /** Whether the action was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the action */
  userErrors: Array<UserError>;
};

/** Input for creating a new API key */
export type ApiKeyCreateInput = {
  /** Optional expiration date for the API key */
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['input'];
};

/** Payload returned after creating an API key */
export type ApiKeyCreatePayload = {
  __typename?: 'ApiKeyCreatePayload';
  /** The newly created API key, null if creation failed */
  apiKey: Maybe<ApiKey>;
  /** List of errors that occurred during creation */
  userErrors: Array<UserError>;
};

/** Input for deleting an API key */
export type ApiKeyDeleteInput = {
  /** ID of the API key to delete */
  id: Scalars['ID']['input'];
};

/** Payload returned after deleting an API key */
export type ApiKeyDeletePayload = {
  __typename?: 'ApiKeyDeletePayload';
  /** ID of the deleted API key, null if deletion failed */
  deletedApiKeyId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during deletion */
  userErrors: Array<UserError>;
};

/** Input for revoking an API key */
export type ApiKeyRevokeInput = {
  /** ID of the API key to revoke */
  id: Scalars['ID']['input'];
};

/** Currency configuration for the project */
export type Currency = {
  __typename?: 'Currency';
  /** ISO 4217 currency code */
  code: CurrencyCode;
  /** Exchange rate relative to the base currency */
  exchangeRate: ExchangeRate;
  /** Whether this currency is currently active for the project */
  isActive: Scalars['Boolean']['output'];
  /** Display name of the currency */
  name: Scalars['String']['output'];
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

/** Input for creating a new currency */
export type CurrencyCreateInput = {
  /** ISO 4217 currency code to add */
  code: CurrencyCode;
  /** Whether the currency should be active upon creation */
  isActive: Scalars['Boolean']['input'];
};

/** Payload returned after creating a currency */
export type CurrencyCreatePayload = {
  __typename?: 'CurrencyCreatePayload';
  /** The newly created currency, null if creation failed */
  currency: Maybe<Currency>;
  /** List of errors that occurred during creation */
  userErrors: Array<UserError>;
};

/** Input for deleting a currency */
export type CurrencyDeleteInput = {
  /** ISO 4217 currency code to delete */
  code: CurrencyCode;
};

/** Payload returned after deleting a currency */
export type CurrencyDeletePayload = {
  __typename?: 'CurrencyDeletePayload';
  /** The code of the deleted currency, null if deletion failed */
  deletedCurrencyCode: Maybe<CurrencyCode>;
  /** List of errors that occurred during deletion */
  userErrors: Array<UserError>;
};

/** Input for setting the default currency */
export type CurrencySetDefaultInput = {
  /** ISO 4217 currency code to set as default */
  currency: CurrencyCode;
};

/** Payload returned after updating currency settings */
export type CurrencyUpdatePayload = {
  __typename?: 'CurrencyUpdatePayload';
  /** Whether the update was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during update */
  userErrors: Array<UserError>;
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

/** Exchange rate representation using integer arithmetic for precision */
export type ExchangeRate = {
  __typename?: 'ExchangeRate';
  /** The exchange rate value as an integer (divide by 10^scale for actual rate) */
  amount: Scalars['Int']['output'];
  /** The number of decimal places in the amount */
  scale: Scalars['Int']['output'];
};

/** Generic implementation of UserError */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  /** Machine-readable error code */
  code: Maybe<Scalars['String']['output']>;
  /** Path to the field that caused the error */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable error message */
  message: Scalars['String']['output'];
};

/** Locale configuration for the project */
export type Locale = {
  __typename?: 'Locale';
  /** BCP 47 locale code */
  code: LocaleCode;
  /** Whether this locale is currently active for the project */
  isActive: Scalars['Boolean']['output'];
  /** Display name of the locale */
  name: Scalars['String']['output'];
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

/** Input for creating a new locale */
export type LocaleCreateInput = {
  /** BCP 47 locale code to add */
  code: LocaleCode;
  /** Whether the locale should be active upon creation */
  isActive: Scalars['Boolean']['input'];
};

/** Payload returned after creating a locale */
export type LocaleCreatePayload = {
  __typename?: 'LocaleCreatePayload';
  /** The newly created locale, null if creation failed */
  locale: Maybe<Locale>;
  /** List of errors that occurred during creation */
  userErrors: Array<UserError>;
};

/** Input for deleting a locale */
export type LocaleDeleteInput = {
  /** BCP 47 locale code to delete */
  code: LocaleCode;
};

/** Payload returned after deleting a locale */
export type LocaleDeletePayload = {
  __typename?: 'LocaleDeletePayload';
  /** The code of the deleted locale, null if deletion failed */
  deletedLocaleCode: Maybe<LocaleCode>;
  /** List of errors that occurred during deletion */
  userErrors: Array<UserError>;
};

/** Input for setting the default locale */
export type LocaleSetDefaultInput = {
  /** BCP 47 locale code to set as default */
  locale: LocaleCode;
};

/** Payload returned after updating locale settings */
export type LocaleUpdatePayload = {
  __typename?: 'LocaleUpdatePayload';
  /** Whether the update was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during update */
  userErrors: Array<UserError>;
};

export type Membership = {
  __typename?: 'Membership';
  domain: Scalars['String']['output'];
  organizationId: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Store-related mutations */
  storeMutation: StoreMutation;
};

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Store-related queries */
  storeQuery: StoreQuery;
};

/** A store */
export type Store = {
  __typename?: 'Store';
  /** Base currency used for exchange rate calculations */
  baseCurrency: CurrencyCode;
  /** Timestamp when the store was created */
  createdAt: Scalars['DateTime']['output'];
  /** List of enabled currency codes for the store */
  currencies: Array<CurrencyCode>;
  /** Default currency for pricing display */
  defaultCurrency: CurrencyCode;
  /** Default unit for product dimensions */
  defaultDimensionUnit: DimensionUnit;
  /** Default locale for new content */
  defaultLocale: LocaleCode;
  /** Default unit for product weights */
  defaultWeightUnit: WeightUnit;
  /** Display name of the store */
  displayName: Scalars['String']['output'];
  /** Contact email address for the store */
  email: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the store */
  id: Scalars['ID']['output'];
  /** List of enabled locale codes for the store */
  locales: Array<LocaleCode>;
  /** Membership info (resolved from IAM by domain) */
  membership: Membership;
  /** URL-friendly unique identifier */
  name: Scalars['String']['output'];
  /** Organization that owns this store (federation reference) */
  organization: Maybe<Organization>;
  /** Current operational status of the store */
  status: StoreStatus;
  /** IANA timezone identifier for the store */
  timezone: Scalars['String']['output'];
  /** Timestamp when the store was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

/** Input for creating a new store */
export type StoreCreateInput = {
  /** Initial list of currency codes to enable */
  currencies: Array<CurrencyCode>;
  /** Default currency for the store */
  defaultCurrency: CurrencyCode;
  /** Display name of the store */
  displayName: Scalars['String']['input'];
  /** Contact email address */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Initial list of locale codes to enable */
  locales: Array<LocaleCode>;
  /** URL-friendly unique identifier */
  name: Scalars['String']['input'];
  /** ID of the organization where the store will be created */
  organizationId: Scalars['ID']['input'];
  /** Initial status of the store */
  status?: InputMaybe<StoreStatus>;
  /** IANA timezone identifier */
  timezone?: InputMaybe<Scalars['String']['input']>;
};

/** Payload returned after creating a store */
export type StoreCreatePayload = {
  __typename?: 'StoreCreatePayload';
  /** The newly created store, null if creation failed */
  store: Maybe<Store>;
  /** List of errors that occurred during creation */
  userErrors: Array<UserError>;
};

/** Input for deleting a store */
export type StoreDeleteInput = {
  /** ID of the store to delete */
  id: Scalars['ID']['input'];
  /** Organization name for authorization context */
  organizationId: Scalars['ID']['input'];
};

/** Payload returned after deleting a store */
export type StoreDeletePayload = {
  __typename?: 'StoreDeletePayload';
  /** ID of the deleted store, null if deletion failed */
  deletedStoreId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during deletion */
  userErrors: Array<UserError>;
};

/** Mutations for store management */
export type StoreMutation = {
  __typename?: 'StoreMutation';
  /** Create a new API key for programmatic access */
  apiKeyCreate: ApiKeyCreatePayload;
  /** Permanently delete an API key */
  apiKeyDelete: ApiKeyDeletePayload;
  /** Revoke an API key (soft delete) */
  apiKeyRevoke: ApiKeyActionPayload;
  /** Add a new currency to the store */
  currencyCreate: CurrencyCreatePayload;
  /** Remove a currency from the store */
  currencyDelete: CurrencyDeletePayload;
  /** Set the default currency for the store */
  currencySetDefault: CurrencyUpdatePayload;
  /** Add a new locale to the store */
  localeCreate: LocaleCreatePayload;
  /** Remove a locale from the store */
  localeDelete: LocaleDeletePayload;
  /** Set the default locale for the store */
  localeSetDefault: LocaleUpdatePayload;
  /** Create a new store */
  storeCreate: StoreCreatePayload;
  /** Delete a store */
  storeDelete: StoreDeletePayload;
  /** Update an existing store */
  storeUpdate: StoreUpdatePayload;
};


/** Mutations for store management */
export type StoreMutationApiKeyCreateArgs = {
  input: ApiKeyCreateInput;
};


/** Mutations for store management */
export type StoreMutationApiKeyDeleteArgs = {
  input: ApiKeyDeleteInput;
};


/** Mutations for store management */
export type StoreMutationApiKeyRevokeArgs = {
  input: ApiKeyRevokeInput;
};


/** Mutations for store management */
export type StoreMutationCurrencyCreateArgs = {
  input: CurrencyCreateInput;
};


/** Mutations for store management */
export type StoreMutationCurrencyDeleteArgs = {
  input: CurrencyDeleteInput;
};


/** Mutations for store management */
export type StoreMutationCurrencySetDefaultArgs = {
  input: CurrencySetDefaultInput;
};


/** Mutations for store management */
export type StoreMutationLocaleCreateArgs = {
  input: LocaleCreateInput;
};


/** Mutations for store management */
export type StoreMutationLocaleDeleteArgs = {
  input: LocaleDeleteInput;
};


/** Mutations for store management */
export type StoreMutationLocaleSetDefaultArgs = {
  input: LocaleSetDefaultInput;
};


/** Mutations for store management */
export type StoreMutationStoreCreateArgs = {
  input: StoreCreateInput;
};


/** Mutations for store management */
export type StoreMutationStoreDeleteArgs = {
  input: StoreDeleteInput;
};


/** Mutations for store management */
export type StoreMutationStoreUpdateArgs = {
  input: StoreUpdateInput;
};

/** Queries for store management */
export type StoreQuery = {
  __typename?: 'StoreQuery';
  /** Get all API keys for the current store */
  apiKeys: Array<ApiKey>;
  /** Get the current store from context */
  currentStore: Maybe<Store>;
  /** Get all stores accessible to the current user in the organization */
  stores: Array<Store>;
};


/** Queries for store management */
export type StoreQueryStoresArgs = {
  organizationId: Scalars['ID']['input'];
};

/** Status of a store */
export enum StoreStatus {
  /** Store is active and operational */
  Active = 'ACTIVE',
  /** Store is inactive and not processing requests */
  Inactive = 'INACTIVE'
}

/** Input for updating an existing store */
export type StoreUpdateInput = {
  /** Updated list of enabled currency codes */
  currencies?: InputMaybe<Array<CurrencyCode>>;
  /** New default dimension unit */
  defaultDimensionUnit?: InputMaybe<DimensionUnit>;
  /** New default weight unit */
  defaultWeightUnit?: InputMaybe<WeightUnit>;
  /** New display name */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** New contact email address */
  email?: InputMaybe<Scalars['String']['input']>;
  /** ID of the store to update */
  id: Scalars['ID']['input'];
  /** Updated list of enabled locale codes */
  locales?: InputMaybe<Array<LocaleCode>>;
  /** New display name */
  name?: InputMaybe<Scalars['String']['input']>;
  /** New IANA timezone identifier */
  timezone?: InputMaybe<Scalars['String']['input']>;
};

/** Payload returned after updating a store */
export type StoreUpdatePayload = {
  __typename?: 'StoreUpdatePayload';
  /** The updated store, null if update failed */
  store: Maybe<Store>;
  /** List of errors that occurred during update */
  userErrors: Array<UserError>;
};

/** Represents a user-facing error */
export type UserError = {
  /** Machine-readable error code */
  code: Maybe<Scalars['String']['output']>;
  /** Path to the field that caused the error */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable error message */
  message: Scalars['String']['output'];
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
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ApiKey: ResolverTypeWrapper<ApiKey>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ApiKeyActionPayload: ResolverTypeWrapper<Omit<ApiKeyActionPayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: ResolverTypeWrapper<Omit<ApiKeyCreatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: ResolverTypeWrapper<Omit<ApiKeyDeletePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  Currency: ResolverTypeWrapper<Currency>;
  CurrencyCode: CurrencyCode;
  CurrencyCreateInput: CurrencyCreateInput;
  CurrencyCreatePayload: ResolverTypeWrapper<Omit<CurrencyCreatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  CurrencyDeleteInput: CurrencyDeleteInput;
  CurrencyDeletePayload: ResolverTypeWrapper<Omit<CurrencyDeletePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  CurrencySetDefaultInput: CurrencySetDefaultInput;
  CurrencyUpdatePayload: ResolverTypeWrapper<Omit<CurrencyUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  ExchangeRate: ResolverTypeWrapper<ExchangeRate>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  Locale: ResolverTypeWrapper<Locale>;
  LocaleCode: LocaleCode;
  LocaleCreateInput: LocaleCreateInput;
  LocaleCreatePayload: ResolverTypeWrapper<Omit<LocaleCreatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  LocaleDeleteInput: LocaleDeleteInput;
  LocaleDeletePayload: ResolverTypeWrapper<Omit<LocaleDeletePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdatePayload: ResolverTypeWrapper<Omit<LocaleUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  Membership: ResolverTypeWrapper<Membership>;
  Mutation: ResolverTypeWrapper<{}>;
  Organization: ResolverTypeWrapper<Organization>;
  Query: ResolverTypeWrapper<{}>;
  Store: ResolverTypeWrapper<Store>;
  StoreCreateInput: StoreCreateInput;
  StoreCreatePayload: ResolverTypeWrapper<Omit<StoreCreatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  StoreDeleteInput: StoreDeleteInput;
  StoreDeletePayload: ResolverTypeWrapper<Omit<StoreDeletePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  StoreMutation: ResolverTypeWrapper<Omit<StoreMutation, 'apiKeyCreate' | 'apiKeyDelete' | 'apiKeyRevoke' | 'currencyCreate' | 'currencyDelete' | 'currencySetDefault' | 'localeCreate' | 'localeDelete' | 'localeSetDefault' | 'storeCreate' | 'storeDelete' | 'storeUpdate'> & { apiKeyCreate: ResolversTypes['ApiKeyCreatePayload'], apiKeyDelete: ResolversTypes['ApiKeyDeletePayload'], apiKeyRevoke: ResolversTypes['ApiKeyActionPayload'], currencyCreate: ResolversTypes['CurrencyCreatePayload'], currencyDelete: ResolversTypes['CurrencyDeletePayload'], currencySetDefault: ResolversTypes['CurrencyUpdatePayload'], localeCreate: ResolversTypes['LocaleCreatePayload'], localeDelete: ResolversTypes['LocaleDeletePayload'], localeSetDefault: ResolversTypes['LocaleUpdatePayload'], storeCreate: ResolversTypes['StoreCreatePayload'], storeDelete: ResolversTypes['StoreDeletePayload'], storeUpdate: ResolversTypes['StoreUpdatePayload'] }>;
  StoreQuery: ResolverTypeWrapper<StoreQuery>;
  StoreStatus: StoreStatus;
  StoreUpdateInput: StoreUpdateInput;
  StoreUpdatePayload: ResolverTypeWrapper<Omit<StoreUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ApiKey: ApiKey;
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  String: Scalars['String']['output'];
  ApiKeyActionPayload: Omit<ApiKeyActionPayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: Omit<ApiKeyCreatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: Omit<ApiKeyDeletePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  Currency: Currency;
  CurrencyCreateInput: CurrencyCreateInput;
  CurrencyCreatePayload: Omit<CurrencyCreatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  CurrencyDeleteInput: CurrencyDeleteInput;
  CurrencyDeletePayload: Omit<CurrencyDeletePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  CurrencySetDefaultInput: CurrencySetDefaultInput;
  CurrencyUpdatePayload: Omit<CurrencyUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  ExchangeRate: ExchangeRate;
  Int: Scalars['Int']['output'];
  GenericUserError: GenericUserError;
  Locale: Locale;
  LocaleCreateInput: LocaleCreateInput;
  LocaleCreatePayload: Omit<LocaleCreatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  LocaleDeleteInput: LocaleDeleteInput;
  LocaleDeletePayload: Omit<LocaleDeletePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdatePayload: Omit<LocaleUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  Membership: Membership;
  Mutation: {};
  Organization: Organization;
  Query: {};
  Store: Store;
  StoreCreateInput: StoreCreateInput;
  StoreCreatePayload: Omit<StoreCreatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  StoreDeleteInput: StoreDeleteInput;
  StoreDeletePayload: Omit<StoreDeletePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  StoreMutation: Omit<StoreMutation, 'apiKeyCreate' | 'apiKeyDelete' | 'apiKeyRevoke' | 'currencyCreate' | 'currencyDelete' | 'currencySetDefault' | 'localeCreate' | 'localeDelete' | 'localeSetDefault' | 'storeCreate' | 'storeDelete' | 'storeUpdate'> & { apiKeyCreate: ResolversParentTypes['ApiKeyCreatePayload'], apiKeyDelete: ResolversParentTypes['ApiKeyDeletePayload'], apiKeyRevoke: ResolversParentTypes['ApiKeyActionPayload'], currencyCreate: ResolversParentTypes['CurrencyCreatePayload'], currencyDelete: ResolversParentTypes['CurrencyDeletePayload'], currencySetDefault: ResolversParentTypes['CurrencyUpdatePayload'], localeCreate: ResolversParentTypes['LocaleCreatePayload'], localeDelete: ResolversParentTypes['LocaleDeletePayload'], localeSetDefault: ResolversParentTypes['LocaleUpdatePayload'], storeCreate: ResolversParentTypes['StoreCreatePayload'], storeDelete: ResolversParentTypes['StoreDeletePayload'], storeUpdate: ResolversParentTypes['StoreUpdatePayload'] };
  StoreQuery: StoreQuery;
  StoreUpdateInput: StoreUpdateInput;
  StoreUpdatePayload: Omit<StoreUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  Timestamp: Scalars['Timestamp']['output'];
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export type ApiKeyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKey'] = ResolversParentTypes['ApiKey']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ApiKey']>, { __typename: 'ApiKey' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdById?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isBanned?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revokedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyActionPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyActionPayload'] = ResolversParentTypes['ApiKeyActionPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyCreatePayload'] = ResolversParentTypes['ApiKeyCreatePayload']> = ResolversObject<{
  apiKey?: Resolver<Maybe<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyDeletePayload'] = ResolversParentTypes['ApiKeyDeletePayload']> = ResolversObject<{
  deletedApiKeyId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Currency'] = ResolversParentTypes['Currency']> = ResolversObject<{
  code?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  exchangeRate?: Resolver<ResolversTypes['ExchangeRate'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CurrencyCreatePayload'] = ResolversParentTypes['CurrencyCreatePayload']> = ResolversObject<{
  currency?: Resolver<Maybe<ResolversTypes['Currency']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CurrencyDeletePayload'] = ResolversParentTypes['CurrencyDeletePayload']> = ResolversObject<{
  deletedCurrencyCode?: Resolver<Maybe<ResolversTypes['CurrencyCode']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CurrencyUpdatePayload'] = ResolversParentTypes['CurrencyUpdatePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type ExchangeRateResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ExchangeRate'] = ResolversParentTypes['ExchangeRate']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scale?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Locale'] = ResolversParentTypes['Locale']> = ResolversObject<{
  code?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleCreatePayload'] = ResolversParentTypes['LocaleCreatePayload']> = ResolversObject<{
  locale?: Resolver<Maybe<ResolversTypes['Locale']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleDeletePayload'] = ResolversParentTypes['LocaleDeletePayload']> = ResolversObject<{
  deletedLocaleCode?: Resolver<Maybe<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleUpdatePayload'] = ResolversParentTypes['LocaleUpdatePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Membership'] = ResolversParentTypes['Membership']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Membership']>, { __typename: 'Membership' } & GraphQLRecursivePick<ParentType, {"domain":true,"organizationId":true}>, ContextType>;


  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  storeMutation?: Resolver<ResolversTypes['StoreMutation'], ParentType, ContextType>;
}>;

export type OrganizationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Organization']>, { __typename: 'Organization' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  storeQuery?: Resolver<ResolversTypes['StoreQuery'], ParentType, ContextType>;
}>;

export type StoreResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Store'] = ResolversParentTypes['Store']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Store']>, { __typename: 'Store' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  baseCurrency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currencies?: Resolver<Array<ResolversTypes['CurrencyCode']>, ParentType, ContextType>;
  defaultCurrency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  defaultDimensionUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  defaultLocale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  defaultWeightUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locales?: Resolver<Array<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  membership?: Resolver<ResolversTypes['Membership'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['StoreStatus'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreCreatePayload'] = ResolversParentTypes['StoreCreatePayload']> = ResolversObject<{
  store?: Resolver<Maybe<ResolversTypes['Store']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreDeletePayload'] = ResolversParentTypes['StoreDeletePayload']> = ResolversObject<{
  deletedStoreId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreMutation'] = ResolversParentTypes['StoreMutation']> = ResolversObject<{
  apiKeyCreate?: Resolver<ResolversTypes['ApiKeyCreatePayload'], ParentType, ContextType, RequireFields<StoreMutationApiKeyCreateArgs, 'input'>>;
  apiKeyDelete?: Resolver<ResolversTypes['ApiKeyDeletePayload'], ParentType, ContextType, RequireFields<StoreMutationApiKeyDeleteArgs, 'input'>>;
  apiKeyRevoke?: Resolver<ResolversTypes['ApiKeyActionPayload'], ParentType, ContextType, RequireFields<StoreMutationApiKeyRevokeArgs, 'input'>>;
  currencyCreate?: Resolver<ResolversTypes['CurrencyCreatePayload'], ParentType, ContextType, RequireFields<StoreMutationCurrencyCreateArgs, 'input'>>;
  currencyDelete?: Resolver<ResolversTypes['CurrencyDeletePayload'], ParentType, ContextType, RequireFields<StoreMutationCurrencyDeleteArgs, 'input'>>;
  currencySetDefault?: Resolver<ResolversTypes['CurrencyUpdatePayload'], ParentType, ContextType, RequireFields<StoreMutationCurrencySetDefaultArgs, 'input'>>;
  localeCreate?: Resolver<ResolversTypes['LocaleCreatePayload'], ParentType, ContextType, RequireFields<StoreMutationLocaleCreateArgs, 'input'>>;
  localeDelete?: Resolver<ResolversTypes['LocaleDeletePayload'], ParentType, ContextType, RequireFields<StoreMutationLocaleDeleteArgs, 'input'>>;
  localeSetDefault?: Resolver<ResolversTypes['LocaleUpdatePayload'], ParentType, ContextType, RequireFields<StoreMutationLocaleSetDefaultArgs, 'input'>>;
  storeCreate?: Resolver<ResolversTypes['StoreCreatePayload'], ParentType, ContextType, RequireFields<StoreMutationStoreCreateArgs, 'input'>>;
  storeDelete?: Resolver<ResolversTypes['StoreDeletePayload'], ParentType, ContextType, RequireFields<StoreMutationStoreDeleteArgs, 'input'>>;
  storeUpdate?: Resolver<ResolversTypes['StoreUpdatePayload'], ParentType, ContextType, RequireFields<StoreMutationStoreUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreQuery'] = ResolversParentTypes['StoreQuery']> = ResolversObject<{
  apiKeys?: Resolver<Array<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  currentStore?: Resolver<Maybe<ResolversTypes['Store']>, ParentType, ContextType>;
  stores?: Resolver<Array<ResolversTypes['Store']>, ParentType, ContextType, RequireFields<StoreQueryStoresArgs, 'organizationId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreUpdatePayload'] = ResolversParentTypes['StoreUpdatePayload']> = ResolversObject<{
  store?: Resolver<Maybe<ResolversTypes['Store']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface TimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Timestamp'], any> {
  name: 'Timestamp';
}

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  ApiKey?: ApiKeyResolvers<ContextType>;
  ApiKeyActionPayload?: ApiKeyActionPayloadResolvers<ContextType>;
  ApiKeyCreatePayload?: ApiKeyCreatePayloadResolvers<ContextType>;
  ApiKeyDeletePayload?: ApiKeyDeletePayloadResolvers<ContextType>;
  Currency?: CurrencyResolvers<ContextType>;
  CurrencyCreatePayload?: CurrencyCreatePayloadResolvers<ContextType>;
  CurrencyDeletePayload?: CurrencyDeletePayloadResolvers<ContextType>;
  CurrencyUpdatePayload?: CurrencyUpdatePayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  ExchangeRate?: ExchangeRateResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  Locale?: LocaleResolvers<ContextType>;
  LocaleCreatePayload?: LocaleCreatePayloadResolvers<ContextType>;
  LocaleDeletePayload?: LocaleDeletePayloadResolvers<ContextType>;
  LocaleUpdatePayload?: LocaleUpdatePayloadResolvers<ContextType>;
  Membership?: MembershipResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Store?: StoreResolvers<ContextType>;
  StoreCreatePayload?: StoreCreatePayloadResolvers<ContextType>;
  StoreDeletePayload?: StoreDeletePayloadResolvers<ContextType>;
  StoreMutation?: StoreMutationResolvers<ContextType>;
  StoreQuery?: StoreQueryResolvers<ContextType>;
  StoreUpdatePayload?: StoreUpdatePayloadResolvers<ContextType>;
  Timestamp?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
}>;

