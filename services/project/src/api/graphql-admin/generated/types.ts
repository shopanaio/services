import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  Email: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

export type ApiKey = {
  __typename?: 'ApiKey';
  createdAt: Scalars['DateTime']['output'];
  createdById: Scalars['ID']['output'];
  dueDate: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isBanned: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  lastUsedAt: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  revokedAt: Maybe<Scalars['DateTime']['output']>;
};

export type ApiKeyActionPayload = {
  __typename?: 'ApiKeyActionPayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<UserError>;
};

export type ApiKeyCreateInput = {
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
};

export type ApiKeyCreatePayload = {
  __typename?: 'ApiKeyCreatePayload';
  apiKey: Maybe<ApiKey>;
  userErrors: Array<UserError>;
};

export type ApiKeyDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiKeyDeletePayload = {
  __typename?: 'ApiKeyDeletePayload';
  deletedApiKeyId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<UserError>;
};

export type ApiKeyRevokeInput = {
  id: Scalars['ID']['input'];
};

export type Currency = {
  __typename?: 'Currency';
  code: CurrencyCode;
  exchangeRate: Scalars['Float']['output'];
  isActive: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
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

export type CurrencySetDefaultInput = {
  currency: CurrencyCode;
};

export type CurrencyUpdatePayload = {
  __typename?: 'CurrencyUpdatePayload';
  success: Scalars['Boolean']['output'];
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

export type Locale = {
  __typename?: 'Locale';
  code: LocaleCode;
  isActive: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
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

export type LocaleCreateInput = {
  code: LocaleCode;
  isActive: Scalars['Boolean']['input'];
};

export type LocaleSetDefaultInput = {
  locale: LocaleCode;
};

export type LocaleUpdateInput = {
  code: LocaleCode;
  isActive: Scalars['Boolean']['input'];
};

export type LocaleUpdatePayload = {
  __typename?: 'LocaleUpdatePayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<UserError>;
};

export type LocalesUpdateInput = {
  create: Array<LocaleCreateInput>;
  delete: Array<LocaleCode>;
  update: Array<LocaleUpdateInput>;
};

export type Mutation = {
  __typename?: 'Mutation';
  projectMutation: ProjectMutation;
};

export type Project = {
  __typename?: 'Project';
  createdAt: Scalars['DateTime']['output'];
  defaultCurrency: CurrencyCode;
  defaultDimensionUnit: DimensionUnit;
  defaultLocale: LocaleCode;
  defaultWeightUnit: WeightUnit;
  email: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phoneNumber: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  status: ProjectStatus;
  timezone: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ProjectCreateInput = {
  defaultCurrency: CurrencyCode;
  email?: InputMaybe<Scalars['String']['input']>;
  locales: Array<LocaleCode>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  status?: InputMaybe<ProjectStatus>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type ProjectCreatePayload = {
  __typename?: 'ProjectCreatePayload';
  project: Maybe<Project>;
  userErrors: Array<UserError>;
};

export type ProjectDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ProjectDeletePayload = {
  __typename?: 'ProjectDeletePayload';
  deletedProjectId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<UserError>;
};

export type ProjectInfo = {
  __typename?: 'ProjectInfo';
  defaultCurrency: CurrencyCode;
  defaultDimensionUnit: DimensionUnit;
  defaultLocale: LocaleCode;
  defaultWeightUnit: WeightUnit;
  email: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phoneNumber: Maybe<Scalars['String']['output']>;
  timezone: Scalars['String']['output'];
};

export type ProjectMutation = {
  __typename?: 'ProjectMutation';
  apiKeyCreate: ApiKeyCreatePayload;
  apiKeyDelete: ApiKeyDeletePayload;
  apiKeyRevoke: ApiKeyActionPayload;
  currencySetDefault: CurrencyUpdatePayload;
  localeSetDefault: LocaleUpdatePayload;
  localesUpdate: LocaleUpdatePayload;
  projectCreate: ProjectCreatePayload;
  projectDelete: ProjectDeletePayload;
  projectUpdate: ProjectUpdatePayload;
};


export type ProjectMutationApiKeyCreateArgs = {
  input: ApiKeyCreateInput;
};


export type ProjectMutationApiKeyDeleteArgs = {
  input: ApiKeyDeleteInput;
};


export type ProjectMutationApiKeyRevokeArgs = {
  input: ApiKeyRevokeInput;
};


export type ProjectMutationCurrencySetDefaultArgs = {
  input: CurrencySetDefaultInput;
};


export type ProjectMutationLocaleSetDefaultArgs = {
  input: LocaleSetDefaultInput;
};


export type ProjectMutationLocalesUpdateArgs = {
  input: LocalesUpdateInput;
};


export type ProjectMutationProjectCreateArgs = {
  input: ProjectCreateInput;
};


export type ProjectMutationProjectDeleteArgs = {
  input: ProjectDeleteInput;
};


export type ProjectMutationProjectUpdateArgs = {
  input: ProjectUpdateInput;
};

export type ProjectQuery = {
  __typename?: 'ProjectQuery';
  /** Get API keys for current project */
  apiKeys: Array<ApiKey>;
  /** Get currencies for current project */
  currencies: Array<Currency>;
  /** Get locales for current project */
  locales: Array<Locale>;
  /** Get a project by slug */
  project: Maybe<Project>;
  /** Get current project info */
  projectInfo: ProjectInfo;
  /** Get all projects */
  projects: Array<Project>;
};


export type ProjectQueryProjectArgs = {
  slug: Scalars['String']['input'];
};

export enum ProjectStatus {
  Active = 'active',
  Inactive = 'inactive'
}

export type ProjectUpdateInput = {
  defaultDimensionUnit?: InputMaybe<DimensionUnit>;
  defaultWeightUnit?: InputMaybe<WeightUnit>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type ProjectUpdatePayload = {
  __typename?: 'ProjectUpdatePayload';
  project: Maybe<Project>;
  userErrors: Array<UserError>;
};

export type Query = {
  __typename?: 'Query';
  projectQuery: ProjectQuery;
};

export type UserError = {
  __typename?: 'UserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
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



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ApiKey: ResolverTypeWrapper<ApiKey>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ApiKeyActionPayload: ResolverTypeWrapper<ApiKeyActionPayload>;
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: ResolverTypeWrapper<ApiKeyCreatePayload>;
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: ResolverTypeWrapper<ApiKeyDeletePayload>;
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  Currency: ResolverTypeWrapper<Currency>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  CurrencyCode: CurrencyCode;
  CurrencySetDefaultInput: CurrencySetDefaultInput;
  CurrencyUpdatePayload: ResolverTypeWrapper<CurrencyUpdatePayload>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Locale: ResolverTypeWrapper<Locale>;
  LocaleCode: LocaleCode;
  LocaleCreateInput: LocaleCreateInput;
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdateInput: LocaleUpdateInput;
  LocaleUpdatePayload: ResolverTypeWrapper<LocaleUpdatePayload>;
  LocalesUpdateInput: LocalesUpdateInput;
  Mutation: ResolverTypeWrapper<{}>;
  Project: ResolverTypeWrapper<Project>;
  ProjectCreateInput: ProjectCreateInput;
  ProjectCreatePayload: ResolverTypeWrapper<ProjectCreatePayload>;
  ProjectDeleteInput: ProjectDeleteInput;
  ProjectDeletePayload: ResolverTypeWrapper<ProjectDeletePayload>;
  ProjectInfo: ResolverTypeWrapper<ProjectInfo>;
  ProjectMutation: ResolverTypeWrapper<ProjectMutation>;
  ProjectQuery: ResolverTypeWrapper<ProjectQuery>;
  ProjectStatus: ProjectStatus;
  ProjectUpdateInput: ProjectUpdateInput;
  ProjectUpdatePayload: ResolverTypeWrapper<ProjectUpdatePayload>;
  Query: ResolverTypeWrapper<{}>;
  Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
  UserError: ResolverTypeWrapper<UserError>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ApiKey: ApiKey;
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  String: Scalars['String']['output'];
  ApiKeyActionPayload: ApiKeyActionPayload;
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: ApiKeyCreatePayload;
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: ApiKeyDeletePayload;
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  Currency: Currency;
  Float: Scalars['Float']['output'];
  CurrencySetDefaultInput: CurrencySetDefaultInput;
  CurrencyUpdatePayload: CurrencyUpdatePayload;
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  Locale: Locale;
  LocaleCreateInput: LocaleCreateInput;
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdateInput: LocaleUpdateInput;
  LocaleUpdatePayload: LocaleUpdatePayload;
  LocalesUpdateInput: LocalesUpdateInput;
  Mutation: {};
  Project: Project;
  ProjectCreateInput: ProjectCreateInput;
  ProjectCreatePayload: ProjectCreatePayload;
  ProjectDeleteInput: ProjectDeleteInput;
  ProjectDeletePayload: ProjectDeletePayload;
  ProjectInfo: ProjectInfo;
  ProjectMutation: ProjectMutation;
  ProjectQuery: ProjectQuery;
  ProjectUpdateInput: ProjectUpdateInput;
  ProjectUpdatePayload: ProjectUpdatePayload;
  Query: {};
  Timestamp: Scalars['Timestamp']['output'];
  UserError: UserError;
}>;

export type ApiKeyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKey'] = ResolversParentTypes['ApiKey']> = ResolversObject<{
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
  exchangeRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type LocaleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Locale'] = ResolversParentTypes['Locale']> = ResolversObject<{
  code?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleUpdatePayload'] = ResolversParentTypes['LocaleUpdatePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  projectMutation?: Resolver<ResolversTypes['ProjectMutation'], ParentType, ContextType>;
}>;

export type ProjectResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultCurrency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  defaultDimensionUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  defaultLocale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  defaultWeightUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProjectStatus'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectCreatePayload'] = ResolversParentTypes['ProjectCreatePayload']> = ResolversObject<{
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectDeletePayload'] = ResolversParentTypes['ProjectDeletePayload']> = ResolversObject<{
  deletedProjectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectInfo'] = ResolversParentTypes['ProjectInfo']> = ResolversObject<{
  defaultCurrency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  defaultDimensionUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  defaultLocale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  defaultWeightUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMutation'] = ResolversParentTypes['ProjectMutation']> = ResolversObject<{
  apiKeyCreate?: Resolver<ResolversTypes['ApiKeyCreatePayload'], ParentType, ContextType, RequireFields<ProjectMutationApiKeyCreateArgs, 'input'>>;
  apiKeyDelete?: Resolver<ResolversTypes['ApiKeyDeletePayload'], ParentType, ContextType, RequireFields<ProjectMutationApiKeyDeleteArgs, 'input'>>;
  apiKeyRevoke?: Resolver<ResolversTypes['ApiKeyActionPayload'], ParentType, ContextType, RequireFields<ProjectMutationApiKeyRevokeArgs, 'input'>>;
  currencySetDefault?: Resolver<ResolversTypes['CurrencyUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationCurrencySetDefaultArgs, 'input'>>;
  localeSetDefault?: Resolver<ResolversTypes['LocaleUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationLocaleSetDefaultArgs, 'input'>>;
  localesUpdate?: Resolver<ResolversTypes['LocaleUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationLocalesUpdateArgs, 'input'>>;
  projectCreate?: Resolver<ResolversTypes['ProjectCreatePayload'], ParentType, ContextType, RequireFields<ProjectMutationProjectCreateArgs, 'input'>>;
  projectDelete?: Resolver<ResolversTypes['ProjectDeletePayload'], ParentType, ContextType, RequireFields<ProjectMutationProjectDeleteArgs, 'input'>>;
  projectUpdate?: Resolver<ResolversTypes['ProjectUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationProjectUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectQuery'] = ResolversParentTypes['ProjectQuery']> = ResolversObject<{
  apiKeys?: Resolver<Array<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  currencies?: Resolver<Array<ResolversTypes['Currency']>, ParentType, ContextType>;
  locales?: Resolver<Array<ResolversTypes['Locale']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectQueryProjectArgs, 'slug'>>;
  projectInfo?: Resolver<ResolversTypes['ProjectInfo'], ParentType, ContextType>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectUpdatePayload'] = ResolversParentTypes['ProjectUpdatePayload']> = ResolversObject<{
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  projectQuery?: Resolver<ResolversTypes['ProjectQuery'], ParentType, ContextType>;
}>;

export interface TimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Timestamp'], any> {
  name: 'Timestamp';
}

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  ApiKey?: ApiKeyResolvers<ContextType>;
  ApiKeyActionPayload?: ApiKeyActionPayloadResolvers<ContextType>;
  ApiKeyCreatePayload?: ApiKeyCreatePayloadResolvers<ContextType>;
  ApiKeyDeletePayload?: ApiKeyDeletePayloadResolvers<ContextType>;
  Currency?: CurrencyResolvers<ContextType>;
  CurrencyUpdatePayload?: CurrencyUpdatePayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  Locale?: LocaleResolvers<ContextType>;
  LocaleUpdatePayload?: LocaleUpdatePayloadResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectCreatePayload?: ProjectCreatePayloadResolvers<ContextType>;
  ProjectDeletePayload?: ProjectDeletePayloadResolvers<ContextType>;
  ProjectInfo?: ProjectInfoResolvers<ContextType>;
  ProjectMutation?: ProjectMutationResolvers<ContextType>;
  ProjectQuery?: ProjectQueryResolvers<ContextType>;
  ProjectUpdatePayload?: ProjectUpdatePayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Timestamp?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
}>;

