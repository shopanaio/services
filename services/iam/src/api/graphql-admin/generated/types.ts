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

export type AuthMutation = {
  __typename?: 'AuthMutation';
  signIn: UserSignInPayload;
  signOut: UserSignOutPayload;
  signUp: UserSignUpPayload;
  tokenRefresh: UserTokenRefreshPayload;
};


export type AuthMutationSignInArgs = {
  input: UserSignInInput;
};


export type AuthMutationSignOutArgs = {
  input: UserSignOutInput;
};


export type AuthMutationSignUpArgs = {
  input: UserSignUpInput;
};


export type AuthMutationTokenRefreshArgs = {
  input: UserTokenRefreshInput;
};

/** Authentication tokens. */
export type AuthTokenPayload = {
  __typename?: 'AuthTokenPayload';
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

/** Input for changing member's role. */
export type ChangeRoleInput = {
  /** Domain (orgId, storeId, or '*' for all). */
  domain: Scalars['String']['input'];
  /** New role name. */
  role: Scalars['String']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type ChangeRolePayload = {
  __typename?: 'ChangeRolePayload';
  member?: Maybe<Member>;
  userErrors: Array<GenericUserError>;
};

/** Input for creating an organization. */
export type CreateOrganizationInput = {
  /** Organization name. */
  name: Scalars['String']['input'];
  /** URL-friendly unique identifier. */
  slug: Scalars['String']['input'];
};

export type CreateOrganizationPayload = {
  __typename?: 'CreateOrganizationPayload';
  organization?: Maybe<Organization>;
  userErrors: Array<GenericUserError>;
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

export type DeleteOrganizationPayload = {
  __typename?: 'DeleteOrganizationPayload';
  deletedOrganizationId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
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

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Input for inviting a member to organization. */
export type InviteMemberInput = {
  /** Email address of the user to invite. */
  email: Scalars['Email']['input'];
  /** Role assignments (at least one required). */
  roles: Array<RoleAssignment>;
};

export type InviteMemberPayload = {
  __typename?: 'InviteMemberPayload';
  member?: Maybe<Member>;
  userErrors: Array<GenericUserError>;
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

/**
 * Member with role assignment.
 * Used for both org-level (domain = orgId) and domain-level (domain = storeId).
 */
export type Member = {
  __typename?: 'Member';
  /** When access was granted. */
  grantedAt: Scalars['DateTime']['output'];
  /** User who granted access. */
  grantedBy?: Maybe<User>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Role name. */
  role: Scalars['String']['output'];
  /** User reference. */
  user: User;
};

/**
 * Membership — universal container for members and roles.
 * Used for both Organization and Store.
 * Domain determines context: orgId for org-level, storeId for store-level.
 */
export type Membership = {
  __typename?: 'Membership';
  /** Available resources for role editor (org-level only). */
  availableResources?: Maybe<Array<ResourceDefinition>>;
  /** Domain identifier (orgId or storeId). */
  domain: Scalars['String']['output'];
  /** All members with access to this domain. */
  members: Array<Member>;
  /** All roles available in this organization. */
  roles: Array<Role>;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Authentication mutations. */
  authMutation: AuthMutation;
  /** Organization management mutations. */
  organizationMutation: OrganizationMutation;
  /** Role management mutations. */
  roleMutation: RoleMutation;
  /** User management mutations. */
  userMutation: UserMutation;
};

/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain stores.
 */
export type Organization = {
  __typename?: 'Organization';
  /** Timestamp when the organization was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Membership info (members + roles). Domain = orgId. */
  membership: Membership;
  /** Organization name (e.g., "Acme Corp"). */
  name: Scalars['String']['output'];
  /** URL-friendly unique identifier. */
  slug: Scalars['String']['output'];
  /** Timestamp when the organization was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Organization mutations. */
export type OrganizationMutation = {
  __typename?: 'OrganizationMutation';
  /** Change role for a member in specific domain. */
  changeRole: ChangeRolePayload;
  /**
   * Create a new organization.
   * Current user becomes the owner.
   */
  createOrganization: CreateOrganizationPayload;
  /** Delete organization. Requires: org owner. */
  deleteOrganization: DeleteOrganizationPayload;
  /** Invite member to organization with role assignments. */
  inviteMember: InviteMemberPayload;
  /** Remove member's access from domain. */
  removeAccess: RemoveAccessPayload;
  /**
   * Remove member from organization.
   * Requires: org admin or owner.
   * Cannot remove self or owner.
   */
  removeMember: RemoveMemberPayload;
  /**
   * Update organization.
   * Requires: org admin or owner.
   */
  updateOrganization: UpdateOrganizationPayload;
};


/** Organization mutations. */
export type OrganizationMutationChangeRoleArgs = {
  input: ChangeRoleInput;
};


/** Organization mutations. */
export type OrganizationMutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


/** Organization mutations. */
export type OrganizationMutationInviteMemberArgs = {
  input: InviteMemberInput;
};


/** Organization mutations. */
export type OrganizationMutationRemoveAccessArgs = {
  input: RemoveAccessInput;
};


/** Organization mutations. */
export type OrganizationMutationRemoveMemberArgs = {
  memberId: Scalars['ID']['input'];
};


/** Organization mutations. */
export type OrganizationMutationUpdateOrganizationArgs = {
  input: UpdateOrganizationInput;
};

/** Permission effect. */
export enum PermissionEffect {
  /** Allow the action. */
  Allow = 'ALLOW',
  /** Deny the action (takes priority over ALLOW). */
  Deny = 'DENY'
}

export type Query = {
  __typename?: 'Query';
  /** Get current organization context (resolved from project). */
  currentOrganization?: Maybe<Organization>;
  /** Get organization by ID (if user has access). */
  organization?: Maybe<Organization>;
  /** Get current authenticated user. */
  userQuery: UserQuery;
};


export type QueryOrganizationArgs = {
  id: Scalars['ID']['input'];
};

/** Input for removing member's access. */
export type RemoveAccessInput = {
  /** Domain to remove access from. */
  domain: Scalars['String']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type RemoveAccessPayload = {
  __typename?: 'RemoveAccessPayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<GenericUserError>;
};

export type RemoveMemberPayload = {
  __typename?: 'RemoveMemberPayload';
  removedMemberId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
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
};

/** Role with permissions - universal, can be assigned at any level. */
export type Role = {
  __typename?: 'Role';
  /** Role creation date. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Role description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name. */
  displayName: Scalars['String']['output'];
  /**
   * Domain scope for this role.
   * "*" = global (all stores)
   * storeId = store-specific role
   */
  domain: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** System role cannot be deleted or modified. */
  isSystem: Scalars['Boolean']['output'];
  /** Unique role name within organization (e.g.: admin, manager, viewer). */
  name: Scalars['String']['output'];
  /** Role permissions. */
  permissions: Array<RolePermission>;
};

/** Role assignment - assigns role to user in specific domain. */
export type RoleAssignment = {
  /** Domain ID (orgId, storeId, or '*' for all stores). */
  domain: Scalars['String']['input'];
  /** Role name. */
  role: Scalars['String']['input'];
};

/** Input for creating a role. */
export type RoleCreateInput = {
  /** Description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name. */
  displayName: Scalars['String']['input'];
  /**
   * Domain scope for role.
   * "*" = global (all stores), default
   * storeId = store-specific role
   */
  domain?: InputMaybe<Scalars['String']['input']>;
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
  /**
   * Domain scope for role lookup.
   * "*" = global (default)
   * storeId = store-specific
   */
  domain?: InputMaybe<Scalars['String']['input']>;
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
  /**
   * Domain scope for role lookup.
   * "*" = global (default)
   * storeId = store-specific
   */
  domain?: InputMaybe<Scalars['String']['input']>;
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

/** Input for updating organization. */
export type UpdateOrganizationInput = {
  /** New name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationPayload = {
  __typename?: 'UpdateOrganizationPayload';
  organization?: Maybe<Organization>;
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
  userUpdateEmail: UserUpdateEmailPayload;
  userUpdatePassword: UserUpdatePasswordPayload;
  userUpdateProfile: UserUpdateProfilePayload;
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
  /**
   * Check authorization for current user.
   * Used for server-side permission checks.
   * For client-side checks, use project.roles + user.role.
   */
  authorize: AuthorizePayload;
  /** Get current authenticated admin user */
  current?: Maybe<User>;
};


export type UserQueryAuthorizeArgs = {
  input: AuthorizeInput;
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
  token?: Maybe<AuthTokenPayload>;
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
  token?: Maybe<AuthTokenPayload>;
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
  token?: Maybe<AuthTokenPayload>;
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
  AuthMutation: ResolverTypeWrapper<AuthMutation>;
  AuthTokenPayload: ResolverTypeWrapper<AuthTokenPayload>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: ResolverTypeWrapper<AuthorizePayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ChangeRoleInput: ChangeRoleInput;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ChangeRolePayload: ResolverTypeWrapper<ChangeRolePayload>;
  CreateOrganizationInput: CreateOrganizationInput;
  CreateOrganizationPayload: ResolverTypeWrapper<CreateOrganizationPayload>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteOrganizationPayload: ResolverTypeWrapper<DeleteOrganizationPayload>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  InviteMemberInput: InviteMemberInput;
  InviteMemberPayload: ResolverTypeWrapper<InviteMemberPayload>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Member: ResolverTypeWrapper<Member>;
  Membership: ResolverTypeWrapper<Membership>;
  Mutation: ResolverTypeWrapper<{}>;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationMutation: ResolverTypeWrapper<OrganizationMutation>;
  PermissionEffect: PermissionEffect;
  Query: ResolverTypeWrapper<{}>;
  RemoveAccessInput: RemoveAccessInput;
  RemoveAccessPayload: ResolverTypeWrapper<RemoveAccessPayload>;
  RemoveMemberPayload: ResolverTypeWrapper<RemoveMemberPayload>;
  ResourceDefinition: ResolverTypeWrapper<ResourceDefinition>;
  Role: ResolverTypeWrapper<Role>;
  RoleAssignment: RoleAssignment;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: ResolverTypeWrapper<RoleCreatePayload>;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: ResolverTypeWrapper<RoleDeletePayload>;
  RoleMutation: ResolverTypeWrapper<RoleMutation>;
  RolePermission: ResolverTypeWrapper<RolePermission>;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: ResolverTypeWrapper<RoleUpdatePayload>;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationPayload: ResolverTypeWrapper<UpdateOrganizationPayload>;
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
  AuthMutation: AuthMutation;
  AuthTokenPayload: AuthTokenPayload;
  String: Scalars['String']['output'];
  Int: Scalars['Int']['output'];
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: AuthorizePayload;
  Boolean: Scalars['Boolean']['output'];
  ChangeRoleInput: ChangeRoleInput;
  ID: Scalars['ID']['output'];
  ChangeRolePayload: ChangeRolePayload;
  CreateOrganizationInput: CreateOrganizationInput;
  CreateOrganizationPayload: CreateOrganizationPayload;
  DateTime: Scalars['DateTime']['output'];
  DeleteOrganizationPayload: DeleteOrganizationPayload;
  Email: Scalars['Email']['output'];
  GenericUserError: GenericUserError;
  InviteMemberInput: InviteMemberInput;
  InviteMemberPayload: InviteMemberPayload;
  JSON: Scalars['JSON']['output'];
  Member: Member;
  Membership: Membership;
  Mutation: {};
  Organization: Organization;
  OrganizationMutation: OrganizationMutation;
  Query: {};
  RemoveAccessInput: RemoveAccessInput;
  RemoveAccessPayload: RemoveAccessPayload;
  RemoveMemberPayload: RemoveMemberPayload;
  ResourceDefinition: ResourceDefinition;
  Role: Role;
  RoleAssignment: RoleAssignment;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: RoleCreatePayload;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: RoleDeletePayload;
  RoleMutation: RoleMutation;
  RolePermission: RolePermission;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: RoleUpdatePayload;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationPayload: UpdateOrganizationPayload;
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

export type AuthMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthMutation'] = ResolversParentTypes['AuthMutation']> = ResolversObject<{
  signIn?: Resolver<ResolversTypes['UserSignInPayload'], ParentType, ContextType, RequireFields<AuthMutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['UserSignOutPayload'], ParentType, ContextType, RequireFields<AuthMutationSignOutArgs, 'input'>>;
  signUp?: Resolver<ResolversTypes['UserSignUpPayload'], ParentType, ContextType, RequireFields<AuthMutationSignUpArgs, 'input'>>;
  tokenRefresh?: Resolver<ResolversTypes['UserTokenRefreshPayload'], ParentType, ContextType, RequireFields<AuthMutationTokenRefreshArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthTokenPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthTokenPayload'] = ResolversParentTypes['AuthTokenPayload']> = ResolversObject<{
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

export type ChangeRolePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ChangeRolePayload'] = ResolversParentTypes['ChangeRolePayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CreateOrganizationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CreateOrganizationPayload'] = ResolversParentTypes['CreateOrganizationPayload']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteOrganizationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteOrganizationPayload'] = ResolversParentTypes['DeleteOrganizationPayload']> = ResolversObject<{
  deletedOrganizationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InviteMemberPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InviteMemberPayload'] = ResolversParentTypes['InviteMemberPayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Member'] = ResolversParentTypes['Member']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Member']>, { __typename: 'Member' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  grantedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  grantedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Membership'] = ResolversParentTypes['Membership']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Membership']>, { __typename: 'Membership' } & GraphQLRecursivePick<ParentType, {"domain":true}>, ContextType>;
  availableResources?: Resolver<Maybe<Array<ResolversTypes['ResourceDefinition']>>, ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['Member']>, ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  authMutation?: Resolver<ResolversTypes['AuthMutation'], ParentType, ContextType>;
  organizationMutation?: Resolver<ResolversTypes['OrganizationMutation'], ParentType, ContextType>;
  roleMutation?: Resolver<ResolversTypes['RoleMutation'], ParentType, ContextType>;
  userMutation?: Resolver<ResolversTypes['UserMutation'], ParentType, ContextType>;
}>;

export type OrganizationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Organization']>, { __typename: 'Organization' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  membership?: Resolver<ResolversTypes['Membership'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationMutation'] = ResolversParentTypes['OrganizationMutation']> = ResolversObject<{
  changeRole?: Resolver<ResolversTypes['ChangeRolePayload'], ParentType, ContextType, RequireFields<OrganizationMutationChangeRoleArgs, 'input'>>;
  createOrganization?: Resolver<ResolversTypes['CreateOrganizationPayload'], ParentType, ContextType, RequireFields<OrganizationMutationCreateOrganizationArgs, 'input'>>;
  deleteOrganization?: Resolver<ResolversTypes['DeleteOrganizationPayload'], ParentType, ContextType>;
  inviteMember?: Resolver<ResolversTypes['InviteMemberPayload'], ParentType, ContextType, RequireFields<OrganizationMutationInviteMemberArgs, 'input'>>;
  removeAccess?: Resolver<ResolversTypes['RemoveAccessPayload'], ParentType, ContextType, RequireFields<OrganizationMutationRemoveAccessArgs, 'input'>>;
  removeMember?: Resolver<ResolversTypes['RemoveMemberPayload'], ParentType, ContextType, RequireFields<OrganizationMutationRemoveMemberArgs, 'memberId'>>;
  updateOrganization?: Resolver<ResolversTypes['UpdateOrganizationPayload'], ParentType, ContextType, RequireFields<OrganizationMutationUpdateOrganizationArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  currentOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, RequireFields<QueryOrganizationArgs, 'id'>>;
  userQuery?: Resolver<ResolversTypes['UserQuery'], ParentType, ContextType>;
}>;

export type RemoveAccessPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemoveAccessPayload'] = ResolversParentTypes['RemoveAccessPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RemoveMemberPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemoveMemberPayload'] = ResolversParentTypes['RemoveMemberPayload']> = ResolversObject<{
  removedMemberId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResourceDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ResourceDefinition'] = ResolversParentTypes['ResourceDefinition']> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Role']>, { __typename: 'Role' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
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

export type UpdateOrganizationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UpdateOrganizationPayload'] = ResolversParentTypes['UpdateOrganizationPayload']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
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
  userUpdateEmail?: Resolver<ResolversTypes['UserUpdateEmailPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateEmailArgs, 'input'>>;
  userUpdatePassword?: Resolver<ResolversTypes['UserUpdatePasswordPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdatePasswordArgs, 'input'>>;
  userUpdateProfile?: Resolver<ResolversTypes['UserUpdateProfilePayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateProfileArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserQuery'] = ResolversParentTypes['UserQuery']> = ResolversObject<{
  authorize?: Resolver<ResolversTypes['AuthorizePayload'], ParentType, ContextType, RequireFields<UserQueryAuthorizeArgs, 'input'>>;
  current?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignInPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignInPayload'] = ResolversParentTypes['UserSignInPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthTokenPayload']>, ParentType, ContextType>;
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
  token?: Resolver<Maybe<ResolversTypes['AuthTokenPayload']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTokenRefreshPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserTokenRefreshPayload'] = ResolversParentTypes['UserTokenRefreshPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthTokenPayload']>, ParentType, ContextType>;
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
  AuthMutation?: AuthMutationResolvers<ContextType>;
  AuthTokenPayload?: AuthTokenPayloadResolvers<ContextType>;
  AuthorizePayload?: AuthorizePayloadResolvers<ContextType>;
  ChangeRolePayload?: ChangeRolePayloadResolvers<ContextType>;
  CreateOrganizationPayload?: CreateOrganizationPayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteOrganizationPayload?: DeleteOrganizationPayloadResolvers<ContextType>;
  Email?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  InviteMemberPayload?: InviteMemberPayloadResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Member?: MemberResolvers<ContextType>;
  Membership?: MembershipResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationMutation?: OrganizationMutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RemoveAccessPayload?: RemoveAccessPayloadResolvers<ContextType>;
  RemoveMemberPayload?: RemoveMemberPayloadResolvers<ContextType>;
  ResourceDefinition?: ResourceDefinitionResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleCreatePayload?: RoleCreatePayloadResolvers<ContextType>;
  RoleDeletePayload?: RoleDeletePayloadResolvers<ContextType>;
  RoleMutation?: RoleMutationResolvers<ContextType>;
  RolePermission?: RolePermissionResolvers<ContextType>;
  RoleUpdatePayload?: RoleUpdatePayloadResolvers<ContextType>;
  UpdateOrganizationPayload?: UpdateOrganizationPayloadResolvers<ContextType>;
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

