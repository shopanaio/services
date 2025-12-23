import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/index.js';
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
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/** Authentication tokens. */
export type AuthToken = {
  __typename?: 'AuthToken';
  /** Access token for API requests. */
  accessToken: Scalars['String']['output'];
  /** Expiration time in seconds. */
  expiresIn: Scalars['Int']['output'];
  /** Refresh token for obtaining new access tokens. */
  refreshToken: Scalars['String']['output'];
};

/** Input for authorize check. */
export type AuthorizeInput = {
  /** Action to check. */
  action: Scalars['String']['input'];
  /** Resource to check. */
  resource: Scalars['String']['input'];
};

export type AuthorizePayload = {
  __typename?: 'AuthorizePayload';
  /** Whether access is allowed. */
  allowed: Scalars['Boolean']['output'];
  /** Reason for denial (if denied). */
  deniedReason?: Maybe<Scalars['String']['output']>;
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

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
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
  /** Role management mutations. */
  roleMutation: RoleMutation;
  /** User management mutations. */
  userMutation: UserMutation;
};

/** Permission effect. */
export enum PermissionEffect {
  /** Allow the action. */
  Allow = 'ALLOW',
  /** Deny the action (takes priority over ALLOW). */
  Deny = 'DENY'
}

export type Project = {
  __typename?: 'Project';
  /**
   * Available resources for role editor.
   * Requires: project:admin permission.
   */
  availableResources: Array<ResourceDefinition>;
  id: Scalars['ID']['output'];
  /**
   * Project team members with roles.
   * Requires: project.team:read permission.
   */
  members: Array<ProjectMember>;
  /**
   * All project roles with permissions.
   * Used by frontend to compute effective permissions.
   */
  roles: Array<Role>;
};

/** Project team member with assigned role. */
export type ProjectMember = {
  __typename?: 'ProjectMember';
  /** Date when role was assigned. */
  grantedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who assigned the role. */
  grantedBy?: Maybe<User>;
  /** User ID. */
  id: Scalars['ID']['output'];
  /** Assigned role. */
  role: Role;
  /** User. */
  user: User;
};

/** Input for removing a member. */
export type ProjectMemberRemoveInput = {
  /** User ID to remove. */
  userId: Scalars['ID']['input'];
};

export type ProjectMemberRemovePayload = {
  __typename?: 'ProjectMemberRemovePayload';
  removedUserId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

/** Input for changing member role. */
export type ProjectMemberRoleChangeInput = {
  /** New role name. */
  newRole: Scalars['String']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type ProjectMemberRoleChangePayload = {
  __typename?: 'ProjectMemberRoleChangePayload';
  member?: Maybe<ProjectMember>;
  userErrors: Array<GenericUserError>;
};

export type Query = {
  __typename?: 'Query';
  /**
   * Check authorization for current user.
   * Used for server-side permission checks.
   * For client-side checks, use project.roles + user.role.
   */
  authorize: AuthorizePayload;
  /** Get current authenticated user. */
  userQuery: UserQuery;
};


export type QueryAuthorizeArgs = {
  input: AuthorizeInput;
};

/** Resource definition for role editor UI. */
export type ResourceDefinition = {
  __typename?: 'ResourceDefinition';
  /** Available actions for resource. */
  actions: Array<Scalars['String']['output']>;
  /** Display name. */
  displayName?: Maybe<Scalars['String']['output']>;
  /** Resource name (product, order, etc.). */
  name: Scalars['String']['output'];
  /** Service name (inventory, orders, etc.). */
  service: Scalars['String']['output'];
};

/** Project role with permissions. */
export type Role = {
  __typename?: 'Role';
  /** Role creation date. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Role description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name. */
  displayName: Scalars['String']['output'];
  /**
   * Roles this role inherits from (for hierarchy).
   * E.g., manager inherits from support.
   */
  inherits: Array<Scalars['String']['output']>;
  /** System role (owner, admin, manager, support, viewer) cannot be deleted. */
  isSystem: Scalars['Boolean']['output'];
  /** Unique role name (e.g.: owner, admin, content-editor). */
  name: Scalars['String']['output'];
  /** Role permissions. */
  permissions: Array<RolePermission>;
};

/** Input for creating a role. */
export type RoleCreateInput = {
  /** Description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name. */
  displayName: Scalars['String']['input'];
  /** Roles to inherit from. */
  inherits?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Unique role name (slug). */
  name: Scalars['String']['input'];
  /** Role permissions. */
  permissions: Array<RolePermissionInput>;
};

export type RoleCreatePayload = {
  __typename?: 'RoleCreatePayload';
  role?: Maybe<Role>;
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a role. */
export type RoleDeleteInput = {
  /** Role name to delete. */
  name: Scalars['String']['input'];
};

export type RoleDeletePayload = {
  __typename?: 'RoleDeletePayload';
  deletedRoleName?: Maybe<Scalars['String']['output']>;
  userErrors: Array<GenericUserError>;
};

/** Role mutations. */
export type RoleMutation = {
  __typename?: 'RoleMutation';
  /**
   * Remove member from team.
   * Requires: project.team:remove permission.
   * Cannot remove self (use leaveProject).
   * Cannot remove project owner.
   */
  projectMemberRemove: ProjectMemberRemovePayload;
  /**
   * Change member's role.
   * Requires: project.team:write permission.
   * Cannot change own role.
   * Cannot assign role higher than own.
   */
  projectMemberRoleChange: ProjectMemberRoleChangePayload;
  /**
   * Create custom role.
   * Requires: project:admin permission.
   */
  roleCreate: RoleCreatePayload;
  /**
   * Delete custom role.
   * Requires: project:admin permission.
   * System roles cannot be deleted.
   * Roles with assigned users cannot be deleted.
   */
  roleDelete: RoleDeletePayload;
  /**
   * Update role.
   * Requires: project:admin permission.
   * System roles cannot be modified.
   */
  roleUpdate: RoleUpdatePayload;
};


/** Role mutations. */
export type RoleMutationProjectMemberRemoveArgs = {
  input: ProjectMemberRemoveInput;
};


/** Role mutations. */
export type RoleMutationProjectMemberRoleChangeArgs = {
  input: ProjectMemberRoleChangeInput;
};


/** Role mutations. */
export type RoleMutationRoleCreateArgs = {
  input: RoleCreateInput;
};


/** Role mutations. */
export type RoleMutationRoleDeleteArgs = {
  input: RoleDeleteInput;
};


/** Role mutations. */
export type RoleMutationRoleUpdateArgs = {
  input: RoleUpdateInput;
};

/** Role permission - access to resource with specific actions. */
export type RolePermission = {
  __typename?: 'RolePermission';
  /**
   * Allowed actions (e.g.: create, read, update, delete).
   * Supports wildcard: *.
   */
  actions: Array<Scalars['String']['output']>;
  /**
   * Effect: ALLOW or DENY.
   * DENY takes priority over ALLOW.
   */
  effect: PermissionEffect;
  /**
   * Resource name (e.g.: product, order, project/settings).
   * Supports wildcards: *, product/*, order/*.
   */
  resource: Scalars['String']['output'];
};

/** Input for role permission. */
export type RolePermissionInput = {
  /** Actions (create, read, update, delete, *). */
  actions: Array<Scalars['String']['input']>;
  /** Effect: ALLOW or DENY. */
  effect: PermissionEffect;
  /** Resource (product, order, *, product/*). */
  resource: Scalars['String']['input'];
};

/** Input for updating a role. */
export type RoleUpdateInput = {
  /** New description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** New display name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Roles to inherit from. */
  inherits?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Role name to update. */
  name: Scalars['String']['input'];
  /** New permissions (completely replaces existing). */
  permissions?: InputMaybe<Array<RolePermissionInput>>;
};

export type RoleUpdatePayload = {
  __typename?: 'RoleUpdatePayload';
  role?: Maybe<Role>;
  userErrors: Array<GenericUserError>;
};

/** User type representing admin users (CMS/backoffice). */
export type User = {
  __typename?: 'User';
  /** URL to user's avatar image. */
  avatar?: Maybe<Scalars['String']['output']>;
  /** The date and time when the user was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** User's email address. */
  email: Scalars['Email']['output'];
  /** Whether the email has been verified. */
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  /** User's first name. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the user. */
  id: Scalars['ID']['output'];
  /** Whether the user has admin privileges. */
  isAdmin?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the user account is deleted. */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the user account is forbidden/banned. */
  isForbidden?: Maybe<Scalars['Boolean']['output']>;
  /** User's last name. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** User's locale/language preference. */
  locale?: Maybe<LocaleCode>;
  /**
   * User's role name in current project context.
   * Returns null if no project context.
   */
  role?: Maybe<Scalars['String']['output']>;
  /** The date and time when the user was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code?: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

export type UserMutation = {
  __typename?: 'UserMutation';
  signIn: UserSignInPayload;
  signOut: UserSignOutPayload;
  signUp: UserSignUpPayload;
  tokenRefresh: UserTokenRefreshPayload;
  userUpdateEmail: UserUpdateEmailPayload;
  userUpdatePassword: UserUpdatePasswordPayload;
  userUpdateProfile: UserUpdateProfilePayload;
};


export type UserMutationSignInArgs = {
  input: UserSignInInput;
};


export type UserMutationSignOutArgs = {
  input: UserSignOutInput;
};


export type UserMutationSignUpArgs = {
  input: UserSignUpInput;
};


export type UserMutationTokenRefreshArgs = {
  input: UserTokenRefreshInput;
};


export type UserMutationUserUpdateEmailArgs = {
  input: UserUpdateEmailInput;
};


export type UserMutationUserUpdatePasswordArgs = {
  input: UserUpdatePasswordInput;
};


export type UserMutationUserUpdateProfileArgs = {
  input: UserUpdateProfileInput;
};

export type UserQuery = {
  __typename?: 'UserQuery';
  /** Get current authenticated admin user */
  current?: Maybe<User>;
};

/** Input for admin user authentication. */
export type UserSignInInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign in. */
export type UserSignInPayload = {
  __typename?: 'UserSignInPayload';
  /** Authentication tokens. */
  token?: Maybe<AuthToken>;
  /** The authenticated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for admin user sign out. */
export type UserSignOutInput = {
  /** Sign out from all sessions. */
  allSessions?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for admin user sign out. */
export type UserSignOutPayload = {
  __typename?: 'UserSignOutPayload';
  /** Whether sign out was successful. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for admin user sign up. */
export type UserSignUpInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign up. */
export type UserSignUpPayload = {
  __typename?: 'UserSignUpPayload';
  /** Authentication tokens. */
  token?: Maybe<AuthToken>;
  /** The created user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for refreshing admin user access token. */
export type UserTokenRefreshInput = {
  /** Refresh token to use for obtaining new access token. */
  refreshToken: Scalars['String']['input'];
};

/** Payload for admin user token refresh. */
export type UserTokenRefreshPayload = {
  __typename?: 'UserTokenRefreshPayload';
  /** New authentication tokens. */
  token?: Maybe<AuthToken>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user email. */
export type UserUpdateEmailInput = {
  /** New email address. */
  newEmail: Scalars['Email']['input'];
};

/** Payload for user email update. */
export type UserUpdateEmailPayload = {
  __typename?: 'UserUpdateEmailPayload';
  /** The updated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user password. */
export type UserUpdatePasswordInput = {
  /** Current password. */
  currentPassword: Scalars['String']['input'];
  /** New password. */
  newPassword: Scalars['String']['input'];
};

/** Payload for user password update. */
export type UserUpdatePasswordPayload = {
  __typename?: 'UserUpdatePasswordPayload';
  /** Whether the password was changed successfully. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user profile. */
export type UserUpdateProfileInput = {
  /** User's first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** User's last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** User's locale/language preference. */
  locale?: InputMaybe<LocaleCode>;
};

/** Payload for user profile update. */
export type UserUpdateProfilePayload = {
  __typename?: 'UserUpdateProfilePayload';
  /** The updated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
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
  AuthToken: ResolverTypeWrapper<AuthToken>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: ResolverTypeWrapper<AuthorizePayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  PermissionEffect: PermissionEffect;
  Project: ResolverTypeWrapper<Project>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ProjectMember: ResolverTypeWrapper<ProjectMember>;
  ProjectMemberRemoveInput: ProjectMemberRemoveInput;
  ProjectMemberRemovePayload: ResolverTypeWrapper<ProjectMemberRemovePayload>;
  ProjectMemberRoleChangeInput: ProjectMemberRoleChangeInput;
  ProjectMemberRoleChangePayload: ResolverTypeWrapper<ProjectMemberRoleChangePayload>;
  Query: ResolverTypeWrapper<{}>;
  ResourceDefinition: ResolverTypeWrapper<ResourceDefinition>;
  Role: ResolverTypeWrapper<Role>;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: ResolverTypeWrapper<RoleCreatePayload>;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: ResolverTypeWrapper<RoleDeletePayload>;
  RoleMutation: ResolverTypeWrapper<RoleMutation>;
  RolePermission: ResolverTypeWrapper<RolePermission>;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: ResolverTypeWrapper<RoleUpdatePayload>;
  User: ResolverTypeWrapper<User>;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  UserMutation: ResolverTypeWrapper<UserMutation>;
  UserQuery: ResolverTypeWrapper<UserQuery>;
  UserSignInInput: UserSignInInput;
  UserSignInPayload: ResolverTypeWrapper<UserSignInPayload>;
  UserSignOutInput: UserSignOutInput;
  UserSignOutPayload: ResolverTypeWrapper<UserSignOutPayload>;
  UserSignUpInput: UserSignUpInput;
  UserSignUpPayload: ResolverTypeWrapper<UserSignUpPayload>;
  UserTokenRefreshInput: UserTokenRefreshInput;
  UserTokenRefreshPayload: ResolverTypeWrapper<UserTokenRefreshPayload>;
  UserUpdateEmailInput: UserUpdateEmailInput;
  UserUpdateEmailPayload: ResolverTypeWrapper<UserUpdateEmailPayload>;
  UserUpdatePasswordInput: UserUpdatePasswordInput;
  UserUpdatePasswordPayload: ResolverTypeWrapper<UserUpdatePasswordPayload>;
  UserUpdateProfileInput: UserUpdateProfileInput;
  UserUpdateProfilePayload: ResolverTypeWrapper<UserUpdateProfilePayload>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AuthToken: AuthToken;
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: AuthorizePayload;
  Boolean: Scalars['Boolean']['output'];
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  GenericUserError: GenericUserError;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Project: Project;
  ID: Scalars['ID']['output'];
  ProjectMember: ProjectMember;
  ProjectMemberRemoveInput: ProjectMemberRemoveInput;
  ProjectMemberRemovePayload: ProjectMemberRemovePayload;
  ProjectMemberRoleChangeInput: ProjectMemberRoleChangeInput;
  ProjectMemberRoleChangePayload: ProjectMemberRoleChangePayload;
  Query: {};
  ResourceDefinition: ResourceDefinition;
  Role: Role;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: RoleCreatePayload;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: RoleDeletePayload;
  RoleMutation: RoleMutation;
  RolePermission: RolePermission;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: RoleUpdatePayload;
  User: User;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  UserMutation: UserMutation;
  UserQuery: UserQuery;
  UserSignInInput: UserSignInInput;
  UserSignInPayload: UserSignInPayload;
  UserSignOutInput: UserSignOutInput;
  UserSignOutPayload: UserSignOutPayload;
  UserSignUpInput: UserSignUpInput;
  UserSignUpPayload: UserSignUpPayload;
  UserTokenRefreshInput: UserTokenRefreshInput;
  UserTokenRefreshPayload: UserTokenRefreshPayload;
  UserUpdateEmailInput: UserUpdateEmailInput;
  UserUpdateEmailPayload: UserUpdateEmailPayload;
  UserUpdatePasswordInput: UserUpdatePasswordInput;
  UserUpdatePasswordPayload: UserUpdatePasswordPayload;
  UserUpdateProfileInput: UserUpdateProfileInput;
  UserUpdateProfilePayload: UserUpdateProfilePayload;
}>;

export type AuthTokenResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthToken'] = ResolversParentTypes['AuthToken']> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresIn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthorizePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthorizePayload'] = ResolversParentTypes['AuthorizePayload']> = ResolversObject<{
  allowed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deniedReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

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

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  roleMutation?: Resolver<ResolversTypes['RoleMutation'], ParentType, ContextType>;
  userMutation?: Resolver<ResolversTypes['UserMutation'], ParentType, ContextType>;
}>;

export type ProjectResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Project']>, { __typename: 'Project' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  availableResources?: Resolver<Array<ResolversTypes['ResourceDefinition']>, { __typename: 'Project' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  members?: Resolver<Array<ResolversTypes['ProjectMember']>, { __typename: 'Project' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, { __typename: 'Project' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMember'] = ResolversParentTypes['ProjectMember']> = ResolversObject<{
  grantedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  grantedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMemberRemovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMemberRemovePayload'] = ResolversParentTypes['ProjectMemberRemovePayload']> = ResolversObject<{
  removedUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMemberRoleChangePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMemberRoleChangePayload'] = ResolversParentTypes['ProjectMemberRoleChangePayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['ProjectMember']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  authorize?: Resolver<ResolversTypes['AuthorizePayload'], ParentType, ContextType, RequireFields<QueryAuthorizeArgs, 'input'>>;
  userQuery?: Resolver<ResolversTypes['UserQuery'], ParentType, ContextType>;
}>;

export type ResourceDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ResourceDefinition'] = ResolversParentTypes['ResourceDefinition']> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  service?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  inherits?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  isSystem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['RolePermission']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleCreatePayload'] = ResolversParentTypes['RoleCreatePayload']> = ResolversObject<{
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleDeletePayload'] = ResolversParentTypes['RoleDeletePayload']> = ResolversObject<{
  deletedRoleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleMutation'] = ResolversParentTypes['RoleMutation']> = ResolversObject<{
  projectMemberRemove?: Resolver<ResolversTypes['ProjectMemberRemovePayload'], ParentType, ContextType, RequireFields<RoleMutationProjectMemberRemoveArgs, 'input'>>;
  projectMemberRoleChange?: Resolver<ResolversTypes['ProjectMemberRoleChangePayload'], ParentType, ContextType, RequireFields<RoleMutationProjectMemberRoleChangeArgs, 'input'>>;
  roleCreate?: Resolver<ResolversTypes['RoleCreatePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleCreateArgs, 'input'>>;
  roleDelete?: Resolver<ResolversTypes['RoleDeletePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleDeleteArgs, 'input'>>;
  roleUpdate?: Resolver<ResolversTypes['RoleUpdatePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePermissionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RolePermission'] = ResolversParentTypes['RolePermission']> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  effect?: Resolver<ResolversTypes['PermissionEffect'], ParentType, ContextType>;
  resource?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleUpdatePayload'] = ResolversParentTypes['RoleUpdatePayload']> = ResolversObject<{
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['User']>, { __typename: 'User' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['Email'], ParentType, ContextType>;
  emailVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAdmin?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isDeleted?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isForbidden?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<Maybe<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UserMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserMutation'] = ResolversParentTypes['UserMutation']> = ResolversObject<{
  signIn?: Resolver<ResolversTypes['UserSignInPayload'], ParentType, ContextType, RequireFields<UserMutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['UserSignOutPayload'], ParentType, ContextType, RequireFields<UserMutationSignOutArgs, 'input'>>;
  signUp?: Resolver<ResolversTypes['UserSignUpPayload'], ParentType, ContextType, RequireFields<UserMutationSignUpArgs, 'input'>>;
  tokenRefresh?: Resolver<ResolversTypes['UserTokenRefreshPayload'], ParentType, ContextType, RequireFields<UserMutationTokenRefreshArgs, 'input'>>;
  userUpdateEmail?: Resolver<ResolversTypes['UserUpdateEmailPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateEmailArgs, 'input'>>;
  userUpdatePassword?: Resolver<ResolversTypes['UserUpdatePasswordPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdatePasswordArgs, 'input'>>;
  userUpdateProfile?: Resolver<ResolversTypes['UserUpdateProfilePayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateProfileArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserQuery'] = ResolversParentTypes['UserQuery']> = ResolversObject<{
  current?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignInPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignInPayload'] = ResolversParentTypes['UserSignInPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignOutPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignOutPayload'] = ResolversParentTypes['UserSignOutPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignUpPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignUpPayload'] = ResolversParentTypes['UserSignUpPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTokenRefreshPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserTokenRefreshPayload'] = ResolversParentTypes['UserTokenRefreshPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdateEmailPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdateEmailPayload'] = ResolversParentTypes['UserUpdateEmailPayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdatePasswordPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdatePasswordPayload'] = ResolversParentTypes['UserUpdatePasswordPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdateProfilePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdateProfilePayload'] = ResolversParentTypes['UserUpdateProfilePayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  AuthToken?: AuthTokenResolvers<ContextType>;
  AuthorizePayload?: AuthorizePayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectMember?: ProjectMemberResolvers<ContextType>;
  ProjectMemberRemovePayload?: ProjectMemberRemovePayloadResolvers<ContextType>;
  ProjectMemberRoleChangePayload?: ProjectMemberRoleChangePayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ResourceDefinition?: ResourceDefinitionResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleCreatePayload?: RoleCreatePayloadResolvers<ContextType>;
  RoleDeletePayload?: RoleDeletePayloadResolvers<ContextType>;
  RoleMutation?: RoleMutationResolvers<ContextType>;
  RolePermission?: RolePermissionResolvers<ContextType>;
  RoleUpdatePayload?: RoleUpdatePayloadResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  UserMutation?: UserMutationResolvers<ContextType>;
  UserQuery?: UserQueryResolvers<ContextType>;
  UserSignInPayload?: UserSignInPayloadResolvers<ContextType>;
  UserSignOutPayload?: UserSignOutPayloadResolvers<ContextType>;
  UserSignUpPayload?: UserSignUpPayloadResolvers<ContextType>;
  UserTokenRefreshPayload?: UserTokenRefreshPayloadResolvers<ContextType>;
  UserUpdateEmailPayload?: UserUpdateEmailPayloadResolvers<ContextType>;
  UserUpdatePasswordPayload?: UserUpdatePasswordPayloadResolvers<ContextType>;
  UserUpdateProfilePayload?: UserUpdateProfilePayloadResolvers<ContextType>;
}>;

