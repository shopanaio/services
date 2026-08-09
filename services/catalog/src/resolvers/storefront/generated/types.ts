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
  /** A CSS color represented as a hexadecimal string. */
  Color: { input: string; output: string; }
  /** An opaque cursor used for pagination. */
  Cursor: { input: string; output: string; }
  /** An ISO 8601-encoded date and time string. */
  DateTime: { input: string; output: string; }
  /** An arbitrary-precision signed decimal number. */
  Decimal: { input: string; output: string; }
  /** An email address. */
  Email: { input: string; output: string; }
  /** A string containing HTML code. */
  HTML: { input: string; output: string; }
  /** An ISO 8601-encoded date and time string. */
  ISO8601DateTime: { input: string; output: string; }
  /** A JSON-serializable value. */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  /** An RFC 3986 and RFC 3987 compliant URI string. */
  URL: { input: string; output: string; }
  /** An unsigned 64-bit integer serialized as a decimal string. */
  UnsignedInt64: { input: string; output: string; }
  _FieldSet: { input: any; output: any; }
};

/** A published category in the storefront catalog hierarchy. */
export type Category = Node & {
  __typename?: 'Category';
  ancestors: Array<Category>;
  children: CategoryConnection;
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<RichText>;
  excerpt: Maybe<RichText>;
  featuredMedia: Maybe<Media>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  media: CategoryMediaConnection;
  name: Scalars['String']['output'];
  parent: Maybe<Category>;
  publishedAt: Scalars['DateTime']['output'];
  seo: Seo;
  updatedAt: Scalars['DateTime']['output'];
};


/** A published category in the storefront catalog hierarchy. */
export type CategoryChildrenArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A published category in the storefront catalog hierarchy. */
export type CategoryMediaArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A Relay connection to categories. */
export type CategoryConnection = Connection & {
  __typename?: 'CategoryConnection';
  edges: Array<CategoryEdge>;
  nodes: Array<Category>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** A category and its opaque position in a category connection. */
export type CategoryEdge = {
  __typename?: 'CategoryEdge';
  cursor: Scalars['Cursor']['output'];
  node: Category;
};

/** A Relay connection to the media registered on a category. */
export type CategoryMediaConnection = Connection & {
  __typename?: 'CategoryMediaConnection';
  edges: Array<CategoryMediaEdge>;
  nodes: Array<Media>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An ordered media item registered on a category. */
export type CategoryMediaEdge = {
  __typename?: 'CategoryMediaEdge';
  cursor: Scalars['Cursor']['output'];
  node: Media;
};

/** Shared fields exposed by every Relay-style connection. */
export type Connection = {
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Supported country codes. */
export enum CountryCode {
  Ac = 'AC',
  Ad = 'AD',
  Ae = 'AE',
  Af = 'AF',
  Ag = 'AG',
  Ai = 'AI',
  Al = 'AL',
  Am = 'AM',
  An = 'AN',
  Ao = 'AO',
  Ar = 'AR',
  At = 'AT',
  Au = 'AU',
  Aw = 'AW',
  Ax = 'AX',
  Az = 'AZ',
  Ba = 'BA',
  Bb = 'BB',
  Bd = 'BD',
  Be = 'BE',
  Bf = 'BF',
  Bg = 'BG',
  Bh = 'BH',
  Bi = 'BI',
  Bj = 'BJ',
  Bl = 'BL',
  Bm = 'BM',
  Bn = 'BN',
  Bo = 'BO',
  Bq = 'BQ',
  Br = 'BR',
  Bs = 'BS',
  Bt = 'BT',
  Bv = 'BV',
  Bw = 'BW',
  By = 'BY',
  Bz = 'BZ',
  Ca = 'CA',
  Cc = 'CC',
  Cd = 'CD',
  Cf = 'CF',
  Cg = 'CG',
  Ch = 'CH',
  Ci = 'CI',
  Ck = 'CK',
  Cl = 'CL',
  Cm = 'CM',
  Cn = 'CN',
  Co = 'CO',
  Cr = 'CR',
  Cu = 'CU',
  Cv = 'CV',
  Cw = 'CW',
  Cx = 'CX',
  Cy = 'CY',
  Cz = 'CZ',
  De = 'DE',
  Dj = 'DJ',
  Dk = 'DK',
  Dm = 'DM',
  Do = 'DO',
  Dz = 'DZ',
  Ec = 'EC',
  Ee = 'EE',
  Eg = 'EG',
  Eh = 'EH',
  Er = 'ER',
  Es = 'ES',
  Et = 'ET',
  Fi = 'FI',
  Fj = 'FJ',
  Fk = 'FK',
  Fm = 'FM',
  Fo = 'FO',
  Fr = 'FR',
  Ga = 'GA',
  Gb = 'GB',
  Gd = 'GD',
  Ge = 'GE',
  Gf = 'GF',
  Gg = 'GG',
  Gh = 'GH',
  Gi = 'GI',
  Gl = 'GL',
  Gm = 'GM',
  Gn = 'GN',
  Gp = 'GP',
  Gq = 'GQ',
  Gr = 'GR',
  Gs = 'GS',
  Gt = 'GT',
  Gw = 'GW',
  Gy = 'GY',
  Hk = 'HK',
  Hm = 'HM',
  Hn = 'HN',
  Hr = 'HR',
  Ht = 'HT',
  Hu = 'HU',
  Id = 'ID',
  Ie = 'IE',
  Il = 'IL',
  Im = 'IM',
  In = 'IN',
  Io = 'IO',
  Iq = 'IQ',
  Ir = 'IR',
  Is = 'IS',
  It = 'IT',
  Je = 'JE',
  Jm = 'JM',
  Jo = 'JO',
  Jp = 'JP',
  Ke = 'KE',
  Kg = 'KG',
  Kh = 'KH',
  Ki = 'KI',
  Km = 'KM',
  Kn = 'KN',
  Kp = 'KP',
  Kr = 'KR',
  Kw = 'KW',
  Ky = 'KY',
  Kz = 'KZ',
  La = 'LA',
  Lb = 'LB',
  Lc = 'LC',
  Li = 'LI',
  Lk = 'LK',
  Lr = 'LR',
  Ls = 'LS',
  Lt = 'LT',
  Lu = 'LU',
  Lv = 'LV',
  Ly = 'LY',
  Ma = 'MA',
  Mc = 'MC',
  Md = 'MD',
  Me = 'ME',
  Mf = 'MF',
  Mg = 'MG',
  Mh = 'MH',
  Mk = 'MK',
  Ml = 'ML',
  Mm = 'MM',
  Mn = 'MN',
  Mo = 'MO',
  Mq = 'MQ',
  Mr = 'MR',
  Ms = 'MS',
  Mt = 'MT',
  Mu = 'MU',
  Mv = 'MV',
  Mw = 'MW',
  Mx = 'MX',
  My = 'MY',
  Mz = 'MZ',
  Na = 'NA',
  Nc = 'NC',
  Ne = 'NE',
  Nf = 'NF',
  Ng = 'NG',
  Ni = 'NI',
  Nl = 'NL',
  No = 'NO',
  Np = 'NP',
  Nr = 'NR',
  Nu = 'NU',
  Nz = 'NZ',
  Om = 'OM',
  Pa = 'PA',
  Pe = 'PE',
  Pf = 'PF',
  Pg = 'PG',
  Ph = 'PH',
  Pk = 'PK',
  Pl = 'PL',
  Pm = 'PM',
  Pn = 'PN',
  Ps = 'PS',
  Pt = 'PT',
  Pw = 'PW',
  Py = 'PY',
  Qa = 'QA',
  Re = 'RE',
  Ro = 'RO',
  Rs = 'RS',
  Ru = 'RU',
  Rw = 'RW',
  Sa = 'SA',
  Sb = 'SB',
  Sc = 'SC',
  Sd = 'SD',
  Se = 'SE',
  Sg = 'SG',
  Sh = 'SH',
  Si = 'SI',
  Sj = 'SJ',
  Sk = 'SK',
  Sl = 'SL',
  Sm = 'SM',
  Sn = 'SN',
  So = 'SO',
  Sr = 'SR',
  Ss = 'SS',
  St = 'ST',
  Sv = 'SV',
  Sx = 'SX',
  Sy = 'SY',
  Sz = 'SZ',
  Ta = 'TA',
  Tc = 'TC',
  Td = 'TD',
  Tf = 'TF',
  Tg = 'TG',
  Th = 'TH',
  Tj = 'TJ',
  Tk = 'TK',
  Tl = 'TL',
  Tm = 'TM',
  Tn = 'TN',
  To = 'TO',
  Tr = 'TR',
  Tt = 'TT',
  Tv = 'TV',
  Tw = 'TW',
  Tz = 'TZ',
  Ua = 'UA',
  Ug = 'UG',
  Um = 'UM',
  Us = 'US',
  Uy = 'UY',
  Uz = 'UZ',
  Va = 'VA',
  Vc = 'VC',
  Ve = 'VE',
  Vg = 'VG',
  Vi = 'VI',
  Vn = 'VN',
  Vu = 'VU',
  Wf = 'WF',
  Ws = 'WS',
  Xk = 'XK',
  Ye = 'YE',
  Yt = 'YT',
  Za = 'ZA',
  Zm = 'ZM',
  Zw = 'ZW',
  Zz = 'ZZ'
}

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

export type Customer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
  /**
   * Presentation-ready comparisons for the authenticated customer.
   *
   * Catalog groups the customer's persisted variants by their current primary
   * category. Each node contains every selected variant in that category. Empty
   * categories are omitted.
   */
  productComparisons: ProductComparisonConnection;
};


export type CustomerProductComparisonsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
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

/** Physical dimensions expressed in a common length unit. */
export type Dimensions = {
  __typename?: 'Dimensions';
  height: Scalars['Float']['output'];
  length: Scalars['Float']['output'];
  unit: DimensionUnit;
  width: Scalars['Float']['output'];
};

/** Represents an error in the input of a mutation. */
export type DisplayableError = {
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export type ExternalVideo = Media & {
  __typename?: 'ExternalVideo';
  id: Scalars['ID']['output'];
};

/**
 * Buyer-safe inventory information for a product variant.
 *
 * Warehouse identities, reservations, unavailable quantities, and unit costs are
 * operational data and are intentionally available only through the Admin API.
 */
export type InventoryItem = Node & {
  __typename?: 'InventoryItem';
  availableForSale: Scalars['Boolean']['output'];
  currentlyNotInStock: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  inventoryPolicy: ProductVariantInventoryPolicy;
  quantityAvailable: Maybe<Scalars['Int']['output']>;
  requiresShipping: Scalars['Boolean']['output'];
  sku: Maybe<Scalars['String']['output']>;
  tracked: Scalars['Boolean']['output'];
  variant: ProductVariant;
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

export type Media = {
  id: Scalars['ID']['output'];
};

export type MediaImage = Media & {
  __typename?: 'MediaImage';
  id: Scalars['ID']['output'];
};

export type Model3d = Media & {
  __typename?: 'Model3d';
  id: Scalars['ID']['output'];
};

/** A precise monetary value with its associated currency. */
export type Money = {
  __typename?: 'Money';
  amount: Scalars['Decimal']['output'];
  currencyCode: CurrencyCode;
};

/**
 * Catalog storefront mutations are intentionally empty. Catalog authoring belongs
 * to the Admin API; buyer-side mutations are owned by cart and checkout services.
 */
export type Mutation = {
  __typename?: 'Mutation';
  _catalog: Maybe<Scalars['Boolean']['output']>;
};

/** Enables global object identification following the Relay specification. */
export type Node = {
  id: Scalars['ID']['output'];
};

/** Metadata used when a catalog page is shared on social platforms. */
export type OpenGraphMetadata = {
  __typename?: 'OpenGraphMetadata';
  description: Maybe<Scalars['String']['output']>;
  image: Maybe<Media>;
  title: Maybe<Scalars['String']['output']>;
};

/** Returns information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['Cursor']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['Cursor']['output']>;
};

/** A published item offered for sale in the storefront catalog. */
export type Product = Node & {
  __typename?: 'Product';
  availableForSale: Scalars['Boolean']['output'];
  categories: CategoryConnection;
  compareAtPriceRange: Maybe<ProductPriceRange>;
  createdAt: Scalars['DateTime']['output'];
  description: Maybe<RichText>;
  excerpt: Maybe<RichText>;
  featureGroups: Array<ProductFeatureGroup>;
  featuredMedia: Maybe<Media>;
  features: Array<ProductFeature>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  media: ProductMediaConnection;
  options: Array<ProductOption>;
  priceRange: Maybe<ProductPriceRange>;
  primaryCategory: Maybe<Category>;
  publishedAt: Scalars['DateTime']['output'];
  selectedOrFirstAvailableVariant: Maybe<ProductVariant>;
  seo: Seo;
  tags: Array<Tag>;
  title: Scalars['String']['output'];
  totalInventory: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variantBySelectedOptions: Maybe<ProductVariant>;
  variants: ProductVariantConnection;
  vendor: Maybe<Vendor>;
};


/** A published item offered for sale in the storefront catalog. */
export type ProductCategoriesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A published item offered for sale in the storefront catalog. */
export type ProductMediaArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A published item offered for sale in the storefront catalog. */
export type ProductSelectedOrFirstAvailableVariantArgs = {
  selectedOptions?: InputMaybe<Array<SelectedOptionInput>>;
};


/** A published item offered for sale in the storefront catalog. */
export type ProductVariantBySelectedOptionsArgs = {
  selectedOptions: Array<SelectedOptionInput>;
};


/** A published item offered for sale in the storefront catalog. */
export type ProductVariantsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * A fully prepared comparison of concrete variants from one product category.
 *
 * Catalog validates publication, ownership and effective-profile compatibility,
 * then resolves product features, selected variant options, prices, availability,
 * media and localized values. The storefront renders the returned connection
 * without grouping products or aligning cells itself.
 */
export type ProductComparison = {
  __typename?: 'ProductComparison';
  /** Current storefront category used to group the selected variants. */
  category: Category;
  /**
   * Prepared variant columns using Relay cursor pagination.
   *
   * The returned connection also contains the row groups for this exact page.
   * Every row's cells use the same order as connection.nodes.
   */
  columns: ProductComparisonColumnConnection;
  /** Stable opaque key derived from the customer and category identities. */
  key: Scalars['String']['output'];
  /** Localized comparison title, when configured by the merchant. */
  title: Maybe<Scalars['String']['output']>;
};


/**
 * A fully prepared comparison of concrete variants from one product category.
 *
 * Catalog validates publication, ownership and effective-profile compatibility,
 * then resolves product features, selected variant options, prices, availability,
 * media and localized values. The storefront renders the returned connection
 * without grouping products or aligning cells itself.
 */
export type ProductComparisonColumnsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * One fully formatted matrix cell.
 *
 * The storefront renders displayValue directly. It does not normalize units,
 * join multiple values, localize missing states or compare canonical values.
 */
export type ProductComparisonCell = {
  __typename?: 'ProductComparisonCell';
  /**
   * Locale-aware text ready for display, including units and configured fallback
   * labels for missing, not-applicable and unavailable states.
   */
  displayValue: Scalars['String']['output'];
  status: ProductComparisonCellStatus;
};

/** Semantic state of a prepared comparison cell. */
export enum ProductComparisonCellStatus {
  /** The property applies, but this product or variant has no configured value. */
  Missing = 'MISSING',
  /** The merchant explicitly marked the property as inapplicable. */
  NotApplicable = 'NOT_APPLICABLE',
  /** A contextual source could not currently resolve the property. */
  Unavailable = 'UNAVAILABLE',
  /** One or more values were resolved and formatted. */
  Value = 'VALUE'
}

/** One concrete variant column in the comparison matrix. */
export type ProductComparisonColumn = {
  __typename?: 'ProductComparisonColumn';
  /** Whether the concrete variant can currently be purchased. */
  availableForSale: Scalars['Boolean']['output'];
  /** Current compare-at price of the concrete variant, when applicable. */
  compareAtPrice: Maybe<Money>;
  /**
   * Media selected by Catalog for the comparison header.
   *
   * Variant media takes precedence over product media.
   */
  featuredMedia: Maybe<Media>;
  /** Stable column key derived from variant.id. */
  key: Scalars['String']['output'];
  /** Zero-based position in the complete comparison, not only this page. */
  position: Scalars['Int']['output'];
  /** Current price of the concrete variant in the storefront currency. */
  price: Maybe<Money>;
  product: Product;
  /** Concrete storefront variant represented by this comparison column. */
  variant: ProductVariant;
};

/** Relay connection containing one page of comparison columns. */
export type ProductComparisonColumnConnection = Connection & {
  __typename?: 'ProductComparisonColumnConnection';
  edges: Array<ProductComparisonColumnEdge>;
  /**
   * Localized row groups prepared for exactly the variants in nodes.
   *
   * Every row contains one cell per node in the same deterministic order.
   */
  groups: Array<ProductComparisonGroup>;
  nodes: Array<ProductComparisonColumn>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** A comparison column and its opaque position in the selected page. */
export type ProductComparisonColumnEdge = {
  __typename?: 'ProductComparisonColumnEdge';
  cursor: Scalars['Cursor']['output'];
  node: ProductComparisonColumn;
};

/** Relay connection containing category-based product comparisons. */
export type ProductComparisonConnection = Connection & {
  __typename?: 'ProductComparisonConnection';
  edges: Array<ProductComparisonEdge>;
  nodes: Array<ProductComparison>;
  pageInfo: PageInfo;
  /**
   * Revision of the persisted customer selection used for this result.
   *
   * Returns zero when the customer has not persisted any comparison items yet.
   */
  revision: Scalars['Int']['output'];
  totalCount: Scalars['Int']['output'];
};

/** A product comparison and its opaque position in the customer result. */
export type ProductComparisonEdge = {
  __typename?: 'ProductComparisonEdge';
  cursor: Scalars['Cursor']['output'];
  node: ProductComparison;
};

/** A localized section of prepared comparison rows. */
export type ProductComparisonGroup = {
  __typename?: 'ProductComparisonGroup';
  /** Opaque stable key suitable for storefront rendering. */
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Prepared rows in merchant-defined display order. */
  rows: Array<ProductComparisonRow>;
};

/**
 * One presentation-ready property row across the current column page.
 *
 * Rows may be sourced from product-level features or from selected variant
 * options such as size, color and package. Both source kinds are aligned through
 * the same canonical comparison field identity.
 */
export type ProductComparisonRow = {
  __typename?: 'ProductComparisonRow';
  /**
   * Prepared cells in exactly the same order as the containing column
   * connection's nodes.
   */
  cells: Array<ProductComparisonCell>;
  description: Maybe<Scalars['String']['output']>;
  /** Whether at least two cells in this page have different semantic values. */
  hasDifferences: Scalars['Boolean']['output'];
  /** Opaque stable key suitable for storefront rendering. */
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/**
 * A presentation-ready component configuration for one product variant.
 *
 * Catalog has already applied visibility, required-state, selection, and price
 * dependency rules. Storefront clients must render this projection instead of
 * interpreting component rules themselves.
 */
export type ProductComponentConfiguration = {
  __typename?: 'ProductComponentConfiguration';
  /** Sum of totalPrice for all selected component items. */
  componentsSubtotal: Money;
  /** The presentation selected by the merchant for this configurator. */
  displayStyle: ProductComponentDisplayStyle;
  /**
   * Effective groups in display order. Groups hidden by backend rules, including
   * groups without any effective visible items, are omitted.
   */
  groups: Array<ProductComponentGroup>;
  id: Scalars['ID']['output'];
  /**
   * Price of one configured parent variant including all selected components.
   * Discounts, shipping, and taxes are applied later by checkout.
   */
  totalPrice: Money;
};

/** How the resolved component configurator should be presented. */
export enum ProductComponentDisplayStyle {
  Accordion = 'ACCORDION',
  Flat = 'FLAT',
  Tabs = 'TABS',
  Wizard = 'WIZARD'
}

/** A presentation-ready component group after backend rule evaluation. */
export type ProductComponentGroup = {
  __typename?: 'ProductComponentGroup';
  id: Scalars['ID']['output'];
  /**
   * Effective visible items in display order. Hidden items are omitted rather
   * than returned for the storefront to evaluate.
   */
  items: Array<ProductComponentItem>;
  /** Effective maximum number of selected items. */
  maxSelection: Maybe<Scalars['Int']['output']>;
  /** Effective minimum number of selected items. */
  minSelection: Maybe<Scalars['Int']['output']>;
  /** Whether the effective group state requires at least one selection. */
  required: Scalars['Boolean']['output'];
  /** Localized display title resolved by Catalog. */
  title: Scalars['String']['output'];
};

/**
 * A presentation-ready component item with a concrete merchandise variant and
 * prices already calculated in the active storefront currency.
 */
export type ProductComponentItem = {
  __typename?: 'ProductComponentItem';
  /** Whether the resolved merchandise variant can currently be purchased. */
  availableForSale: Scalars['Boolean']['output'];
  /** Effective media after applying the item override and merchandise fallback. */
  featuredMedia: Maybe<Media>;
  id: Scalars['ID']['output'];
  /** Effective maximum quantity, or null when no maximum is configured. */
  maxQuantity: Maybe<Scalars['Int']['output']>;
  /** Effective minimum quantity when the item is selected. */
  minQuantity: Scalars['Int']['output'];
  /** Referenced published product. */
  product: Product;
  /** Resolved quantity. Zero means the item is not selected. */
  quantity: Scalars['Int']['output'];
  /** Whether backend dependency rules require this item. */
  required: Scalars['Boolean']['output'];
  /** Whether this item is selected in the resolved state. */
  selected: Scalars['Boolean']['output'];
  /**
   * Localized display title. Catalog applies the component title override first,
   * then falls back to the resolved variant or product title.
   */
  title: Scalars['String']['output'];
  /** Final unitPrice multiplied by quantity. */
  totalPrice: Money;
  /**
   * Final price for one item unit after all component price rules have been
   * evaluated in the active storefront currency.
   */
  unitPrice: Money;
  /**
   * Concrete published variant resolved for this state. A product-backed item
   * uses the selected allowed variant or a backend-selected default.
   */
  variant: ProductVariant;
};

/**
 * One item selected in a product component configuration.
 *
 * The list supplied to ProductVariant.componentConfiguration is the complete
 * selection state. For an item that references a product, variantId identifies
 * the concrete allowed variant selected by the buyer. For an item that already
 * references a concrete variant, variantId may be omitted.
 */
export type ProductComponentSelectionInput = {
  itemId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

/** A localized product specification such as material or screen size. */
export type ProductFeature = Node & {
  __typename?: 'ProductFeature';
  featured: Scalars['Boolean']['output'];
  group: Maybe<ProductFeatureGroup>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  values: Array<ProductFeatureValue>;
};

/** A presentation group containing related product specifications. */
export type ProductFeatureGroup = Node & {
  __typename?: 'ProductFeatureGroup';
  featured: Scalars['Boolean']['output'];
  features: Array<ProductFeature>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

/** A localized value assigned to a product specification. */
export type ProductFeatureValue = Node & {
  __typename?: 'ProductFeatureValue';
  feature: ProductFeature;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

/** A Relay connection to the media registered on a product. */
export type ProductMediaConnection = Connection & {
  __typename?: 'ProductMediaConnection';
  edges: Array<ProductMediaEdge>;
  nodes: Array<Media>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An ordered media item registered on a product. */
export type ProductMediaEdge = {
  __typename?: 'ProductMediaEdge';
  cursor: Scalars['Cursor']['output'];
  node: Media;
};

/** A configurable product dimension such as size, color, or material. */
export type ProductOption = Node & {
  __typename?: 'ProductOption';
  category: ProductOptionCategory;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  optionValues: Array<ProductOptionValue>;
  position: Scalars['Int']['output'];
};

/** A reusable product option category. */
export type ProductOptionCategory = Node & {
  __typename?: 'ProductOptionCategory';
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** The visual representation used for an option value. */
export enum ProductOptionSwatchType {
  Color = 'COLOR',
  Gradient = 'GRADIENT',
  Image = 'IMAGE'
}

/** One customer-selectable value of a product option. */
export type ProductOptionValue = Node & {
  __typename?: 'ProductOptionValue';
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  swatch: Maybe<ProductOptionValueSwatch>;
};

export type ProductOptionValueSwatch = {
  __typename?: 'ProductOptionValueSwatch';
  color: Maybe<Scalars['Color']['output']>;
  image: Maybe<Media>;
  metadata: Maybe<Scalars['JSON']['output']>;
  secondaryColor: Maybe<Scalars['Color']['output']>;
  type: ProductOptionSwatchType;
};

/** The lowest and highest current variant prices for a product. */
export type ProductPriceRange = {
  __typename?: 'ProductPriceRange';
  maxVariantPrice: Money;
  minVariantPrice: Money;
};

/** A purchasable combination of product option values. */
export type ProductVariant = Node & {
  __typename?: 'ProductVariant';
  availableForSale: Scalars['Boolean']['output'];
  compareAtPrice: Maybe<Money>;
  componentConfiguration: Maybe<ProductComponentConfiguration>;
  createdAt: Scalars['DateTime']['output'];
  currentlyNotInStock: Scalars['Boolean']['output'];
  dimensions: Maybe<Dimensions>;
  featuredMedia: Maybe<Media>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  inventoryItem: Maybe<InventoryItem>;
  isDefault: Scalars['Boolean']['output'];
  media: ProductVariantMediaConnection;
  price: Maybe<Money>;
  product: Product;
  quantityAvailable: Maybe<Scalars['Int']['output']>;
  requiresShipping: Scalars['Boolean']['output'];
  selectedOptions: Array<SelectedOption>;
  sku: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  weight: Maybe<Weight>;
};


/** A purchasable combination of product option values. */
export type ProductVariantComponentConfigurationArgs = {
  selections?: InputMaybe<Array<ProductComponentSelectionInput>>;
};


/** A purchasable combination of product option values. */
export type ProductVariantMediaArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A Relay connection to product variants. */
export type ProductVariantConnection = Connection & {
  __typename?: 'ProductVariantConnection';
  edges: Array<ProductVariantEdge>;
  nodes: Array<ProductVariant>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ProductVariantEdge = {
  __typename?: 'ProductVariantEdge';
  cursor: Scalars['Cursor']['output'];
  node: ProductVariant;
};

/** The policy applied when a tracked variant has no sellable inventory. */
export enum ProductVariantInventoryPolicy {
  /** The variant can be purchased when inventory is unavailable. */
  Continue = 'CONTINUE',
  /** The variant cannot be purchased when inventory is unavailable. */
  Deny = 'DENY'
}

/** A Relay connection to media selected for a particular product variant. */
export type ProductVariantMediaConnection = Connection & {
  __typename?: 'ProductVariantMediaConnection';
  edges: Array<ProductVariantMediaEdge>;
  nodes: Array<Media>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An ordered media item selected for a particular product variant. */
export type ProductVariantMediaEdge = {
  __typename?: 'ProductVariantMediaEdge';
  cursor: Scalars['Cursor']['output'];
  node: Media;
};

/** Public Catalog entry points for the active storefront context. */
export type Query = {
  __typename?: 'Query';
  /** Returns published categories using Relay cursor pagination. */
  categories: CategoryConnection;
  /** Returns a published category by its globally unique Relay ID. */
  category: Maybe<Category>;
  /** Returns a published category by its stable storefront handle. */
  categoryByHandle: Maybe<Category>;
  /** Returns any catalog object by its globally unique Relay ID. */
  node: Maybe<Node>;
  /** Returns catalog objects in the same order as the supplied Relay IDs. */
  nodes: Array<Maybe<Node>>;
  /** Returns a published product by its globally unique Relay ID. */
  product: Maybe<Product>;
  /** Returns a published product by its stable storefront handle. */
  productByHandle: Maybe<Product>;
  /**
   * Builds a presentation-ready comparison for concrete published variants.
   *
   * All variants must currently belong to the same primary category. Input order
   * is preserved as column order. Different variants of the same product are
   * allowed, while duplicate variant IDs are rejected. Authenticated customer
   * selections are exposed as category-grouped ProductComparison nodes through
   * Customer.productComparisons.
   */
  productComparison: Maybe<ProductComparison>;
  /** Returns a published product variant by its globally unique Relay ID. */
  productVariant: Maybe<ProductVariant>;
};


/** Public Catalog entry points for the active storefront context. */
export type QueryCategoriesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Public Catalog entry points for the active storefront context. */
export type QueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


/** Public Catalog entry points for the active storefront context. */
export type QueryCategoryByHandleArgs = {
  handle: Scalars['String']['input'];
};


/** Public Catalog entry points for the active storefront context. */
export type QueryNodeArgs = {
  id: Scalars['ID']['input'];
};


/** Public Catalog entry points for the active storefront context. */
export type QueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Public Catalog entry points for the active storefront context. */
export type QueryProductArgs = {
  id: Scalars['ID']['input'];
};


/** Public Catalog entry points for the active storefront context. */
export type QueryProductByHandleArgs = {
  handle: Scalars['String']['input'];
};


/** Public Catalog entry points for the active storefront context. */
export type QueryProductComparisonArgs = {
  variantIds: Array<Scalars['ID']['input']>;
};


/** Public Catalog entry points for the active storefront context. */
export type QueryProductVariantArgs = {
  id: Scalars['ID']['input'];
};

/** Localized rich text in plain text, HTML, and structured JSON formats. */
export type RichText = {
  __typename?: 'RichText';
  html: Scalars['HTML']['output'];
  json: Scalars['JSON']['output'];
  text: Scalars['String']['output'];
};

/** Search-engine and social-sharing metadata. */
export type Seo = {
  __typename?: 'SEO';
  description: Maybe<Scalars['String']['output']>;
  openGraph: OpenGraphMetadata;
  title: Maybe<Scalars['String']['output']>;
};

/** A resolved option/value pair selected by a product variant. */
export type SelectedOption = {
  __typename?: 'SelectedOption';
  name: Scalars['String']['output'];
  option: ProductOption;
  optionValue: ProductOptionValue;
  value: Scalars['String']['output'];
};

/** Stable option and value handles used to resolve a product variant. */
export type SelectedOptionInput = {
  option: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

/** A localized, stable label used to organize and filter products. */
export type Tag = Node & {
  __typename?: 'Tag';
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Represents a generic error in the input of a mutation. */
export type UserError = DisplayableError & {
  __typename?: 'UserError';
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** The brand, manufacturer, or supplier associated with a product. */
export type Vendor = Node & {
  __typename?: 'Vendor';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type Video = Media & {
  __typename?: 'Video';
  id: Scalars['ID']['output'];
};

/** A weight measurement expressed in a supported unit. */
export type Weight = {
  __typename?: 'Weight';
  unit: WeightUnit;
  value: Scalars['Float']['output'];
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
  Connection: ( Omit<CategoryConnection, 'nodes'> & { nodes: Array<_RefType['Category']> } ) | ( Omit<CategoryMediaConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['CategoryMediaEdge']>, nodes: Array<_RefType['Media']> } ) | ( Omit<ProductComparisonColumnConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ProductComparisonColumnEdge']>, nodes: Array<_RefType['ProductComparisonColumn']> } ) | ( Omit<ProductComparisonConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ProductComparisonEdge']>, nodes: Array<_RefType['ProductComparison']> } ) | ( Omit<ProductMediaConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ProductMediaEdge']>, nodes: Array<_RefType['Media']> } ) | ( Omit<ProductVariantConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ProductVariantEdge']>, nodes: Array<_RefType['ProductVariant']> } ) | ( Omit<ProductVariantMediaConnection, 'edges' | 'nodes'> & { edges: Array<_RefType['ProductVariantMediaEdge']>, nodes: Array<_RefType['Media']> } );
  DisplayableError: ( UserError );
  Media: ( ExternalVideo ) | ( MediaImage ) | ( Model3d ) | ( Video );
  Node: ( Omit<Category, 'ancestors' | 'description' | 'excerpt' | 'featuredMedia' | 'media' | 'parent' | 'seo'> & { ancestors: Array<_RefType['Category']>, description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, featuredMedia?: Maybe<_RefType['Media']>, media: _RefType['CategoryMediaConnection'], parent?: Maybe<_RefType['Category']>, seo: _RefType['SEO'] } ) | ( Omit<InventoryItem, 'variant'> & { variant: _RefType['ProductVariant'] } ) | ( Omit<Product, 'compareAtPriceRange' | 'description' | 'excerpt' | 'featuredMedia' | 'media' | 'options' | 'priceRange' | 'primaryCategory' | 'selectedOrFirstAvailableVariant' | 'seo' | 'variantBySelectedOptions' | 'variants'> & { compareAtPriceRange?: Maybe<_RefType['ProductPriceRange']>, description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, featuredMedia?: Maybe<_RefType['Media']>, media: _RefType['ProductMediaConnection'], options: Array<_RefType['ProductOption']>, priceRange?: Maybe<_RefType['ProductPriceRange']>, primaryCategory?: Maybe<_RefType['Category']>, selectedOrFirstAvailableVariant?: Maybe<_RefType['ProductVariant']>, seo: _RefType['SEO'], variantBySelectedOptions?: Maybe<_RefType['ProductVariant']>, variants: _RefType['ProductVariantConnection'] } ) | ( ProductFeature ) | ( ProductFeatureGroup ) | ( ProductFeatureValue ) | ( Omit<ProductOption, 'category' | 'optionValues'> & { category: _RefType['ProductOptionCategory'], optionValues: Array<_RefType['ProductOptionValue']> } ) | ( ProductOptionCategory ) | ( Omit<ProductOptionValue, 'swatch'> & { swatch?: Maybe<_RefType['ProductOptionValueSwatch']> } ) | ( Omit<ProductVariant, 'compareAtPrice' | 'componentConfiguration' | 'featuredMedia' | 'inventoryItem' | 'media' | 'price' | 'product' | 'selectedOptions'> & { compareAtPrice?: Maybe<_RefType['Money']>, componentConfiguration?: Maybe<_RefType['ProductComponentConfiguration']>, featuredMedia?: Maybe<_RefType['Media']>, inventoryItem?: Maybe<_RefType['InventoryItem']>, media: _RefType['ProductVariantMediaConnection'], price?: Maybe<_RefType['Money']>, product: _RefType['Product'], selectedOptions: Array<_RefType['SelectedOption']> } ) | ( Tag ) | ( Vendor );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Category: ResolverTypeWrapper<Omit<Category, 'ancestors' | 'description' | 'excerpt' | 'featuredMedia' | 'media' | 'parent' | 'seo'> & { ancestors: Array<ResolversTypes['Category']>, description?: Maybe<ResolversTypes['RichText']>, excerpt?: Maybe<ResolversTypes['RichText']>, featuredMedia?: Maybe<ResolversTypes['Media']>, media: ResolversTypes['CategoryMediaConnection'], parent?: Maybe<ResolversTypes['Category']>, seo: ResolversTypes['SEO'] }>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  CategoryConnection: ResolverTypeWrapper<Omit<CategoryConnection, 'nodes'> & { nodes: Array<ResolversTypes['Category']> }>;
  CategoryEdge: ResolverTypeWrapper<Omit<CategoryEdge, 'node'> & { node: ResolversTypes['Category'] }>;
  CategoryMediaConnection: ResolverTypeWrapper<Omit<CategoryMediaConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['CategoryMediaEdge']>, nodes: Array<ResolversTypes['Media']> }>;
  CategoryMediaEdge: ResolverTypeWrapper<Omit<CategoryMediaEdge, 'node'> & { node: ResolversTypes['Media'] }>;
  Color: ResolverTypeWrapper<Scalars['Color']['output']>;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  CountryCode: CountryCode;
  CurrencyCode: CurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  Customer: ResolverTypeWrapper<Omit<Customer, 'productComparisons'> & { productComparisons: ResolversTypes['ProductComparisonConnection'] }>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DimensionUnit: DimensionUnit;
  Dimensions: ResolverTypeWrapper<Dimensions>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  DisplayableError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['DisplayableError']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  ExternalVideo: ResolverTypeWrapper<ExternalVideo>;
  HTML: ResolverTypeWrapper<Scalars['HTML']['output']>;
  ISO8601DateTime: ResolverTypeWrapper<Scalars['ISO8601DateTime']['output']>;
  InventoryItem: ResolverTypeWrapper<Omit<InventoryItem, 'variant'> & { variant: ResolversTypes['ProductVariant'] }>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Media: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Media']>;
  MediaImage: ResolverTypeWrapper<MediaImage>;
  Model3d: ResolverTypeWrapper<Model3d>;
  Money: ResolverTypeWrapper<Money>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  OpenGraphMetadata: ResolverTypeWrapper<Omit<OpenGraphMetadata, 'image'> & { image?: Maybe<ResolversTypes['Media']> }>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Product: ResolverTypeWrapper<Omit<Product, 'compareAtPriceRange' | 'description' | 'excerpt' | 'featuredMedia' | 'media' | 'options' | 'priceRange' | 'primaryCategory' | 'selectedOrFirstAvailableVariant' | 'seo' | 'variantBySelectedOptions' | 'variants'> & { compareAtPriceRange?: Maybe<ResolversTypes['ProductPriceRange']>, description?: Maybe<ResolversTypes['RichText']>, excerpt?: Maybe<ResolversTypes['RichText']>, featuredMedia?: Maybe<ResolversTypes['Media']>, media: ResolversTypes['ProductMediaConnection'], options: Array<ResolversTypes['ProductOption']>, priceRange?: Maybe<ResolversTypes['ProductPriceRange']>, primaryCategory?: Maybe<ResolversTypes['Category']>, selectedOrFirstAvailableVariant?: Maybe<ResolversTypes['ProductVariant']>, seo: ResolversTypes['SEO'], variantBySelectedOptions?: Maybe<ResolversTypes['ProductVariant']>, variants: ResolversTypes['ProductVariantConnection'] }>;
  ProductComparison: ResolverTypeWrapper<Omit<ProductComparison, 'category' | 'columns'> & { category: ResolversTypes['Category'], columns: ResolversTypes['ProductComparisonColumnConnection'] }>;
  ProductComparisonCell: ResolverTypeWrapper<ProductComparisonCell>;
  ProductComparisonCellStatus: ProductComparisonCellStatus;
  ProductComparisonColumn: ResolverTypeWrapper<Omit<ProductComparisonColumn, 'compareAtPrice' | 'featuredMedia' | 'price' | 'product' | 'variant'> & { compareAtPrice?: Maybe<ResolversTypes['Money']>, featuredMedia?: Maybe<ResolversTypes['Media']>, price?: Maybe<ResolversTypes['Money']>, product: ResolversTypes['Product'], variant: ResolversTypes['ProductVariant'] }>;
  ProductComparisonColumnConnection: ResolverTypeWrapper<Omit<ProductComparisonColumnConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ProductComparisonColumnEdge']>, nodes: Array<ResolversTypes['ProductComparisonColumn']> }>;
  ProductComparisonColumnEdge: ResolverTypeWrapper<Omit<ProductComparisonColumnEdge, 'node'> & { node: ResolversTypes['ProductComparisonColumn'] }>;
  ProductComparisonConnection: ResolverTypeWrapper<Omit<ProductComparisonConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ProductComparisonEdge']>, nodes: Array<ResolversTypes['ProductComparison']> }>;
  ProductComparisonEdge: ResolverTypeWrapper<Omit<ProductComparisonEdge, 'node'> & { node: ResolversTypes['ProductComparison'] }>;
  ProductComparisonGroup: ResolverTypeWrapper<ProductComparisonGroup>;
  ProductComparisonRow: ResolverTypeWrapper<ProductComparisonRow>;
  ProductComponentConfiguration: ResolverTypeWrapper<Omit<ProductComponentConfiguration, 'componentsSubtotal' | 'groups' | 'totalPrice'> & { componentsSubtotal: ResolversTypes['Money'], groups: Array<ResolversTypes['ProductComponentGroup']>, totalPrice: ResolversTypes['Money'] }>;
  ProductComponentDisplayStyle: ProductComponentDisplayStyle;
  ProductComponentGroup: ResolverTypeWrapper<Omit<ProductComponentGroup, 'items'> & { items: Array<ResolversTypes['ProductComponentItem']> }>;
  ProductComponentItem: ResolverTypeWrapper<Omit<ProductComponentItem, 'featuredMedia' | 'product' | 'totalPrice' | 'unitPrice' | 'variant'> & { featuredMedia?: Maybe<ResolversTypes['Media']>, product: ResolversTypes['Product'], totalPrice: ResolversTypes['Money'], unitPrice: ResolversTypes['Money'], variant: ResolversTypes['ProductVariant'] }>;
  ProductComponentSelectionInput: ProductComponentSelectionInput;
  ProductFeature: ResolverTypeWrapper<ProductFeature>;
  ProductFeatureGroup: ResolverTypeWrapper<ProductFeatureGroup>;
  ProductFeatureValue: ResolverTypeWrapper<ProductFeatureValue>;
  ProductMediaConnection: ResolverTypeWrapper<Omit<ProductMediaConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ProductMediaEdge']>, nodes: Array<ResolversTypes['Media']> }>;
  ProductMediaEdge: ResolverTypeWrapper<Omit<ProductMediaEdge, 'node'> & { node: ResolversTypes['Media'] }>;
  ProductOption: ResolverTypeWrapper<Omit<ProductOption, 'category' | 'optionValues'> & { category: ResolversTypes['ProductOptionCategory'], optionValues: Array<ResolversTypes['ProductOptionValue']> }>;
  ProductOptionCategory: ResolverTypeWrapper<ProductOptionCategory>;
  ProductOptionSwatchType: ProductOptionSwatchType;
  ProductOptionValue: ResolverTypeWrapper<Omit<ProductOptionValue, 'swatch'> & { swatch?: Maybe<ResolversTypes['ProductOptionValueSwatch']> }>;
  ProductOptionValueSwatch: ResolverTypeWrapper<Omit<ProductOptionValueSwatch, 'image'> & { image?: Maybe<ResolversTypes['Media']> }>;
  ProductPriceRange: ResolverTypeWrapper<Omit<ProductPriceRange, 'maxVariantPrice' | 'minVariantPrice'> & { maxVariantPrice: ResolversTypes['Money'], minVariantPrice: ResolversTypes['Money'] }>;
  ProductVariant: ResolverTypeWrapper<Omit<ProductVariant, 'compareAtPrice' | 'componentConfiguration' | 'featuredMedia' | 'inventoryItem' | 'media' | 'price' | 'product' | 'selectedOptions'> & { compareAtPrice?: Maybe<ResolversTypes['Money']>, componentConfiguration?: Maybe<ResolversTypes['ProductComponentConfiguration']>, featuredMedia?: Maybe<ResolversTypes['Media']>, inventoryItem?: Maybe<ResolversTypes['InventoryItem']>, media: ResolversTypes['ProductVariantMediaConnection'], price?: Maybe<ResolversTypes['Money']>, product: ResolversTypes['Product'], selectedOptions: Array<ResolversTypes['SelectedOption']> }>;
  ProductVariantConnection: ResolverTypeWrapper<Omit<ProductVariantConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ProductVariantEdge']>, nodes: Array<ResolversTypes['ProductVariant']> }>;
  ProductVariantEdge: ResolverTypeWrapper<Omit<ProductVariantEdge, 'node'> & { node: ResolversTypes['ProductVariant'] }>;
  ProductVariantInventoryPolicy: ProductVariantInventoryPolicy;
  ProductVariantMediaConnection: ResolverTypeWrapper<Omit<ProductVariantMediaConnection, 'edges' | 'nodes'> & { edges: Array<ResolversTypes['ProductVariantMediaEdge']>, nodes: Array<ResolversTypes['Media']> }>;
  ProductVariantMediaEdge: ResolverTypeWrapper<Omit<ProductVariantMediaEdge, 'node'> & { node: ResolversTypes['Media'] }>;
  Query: ResolverTypeWrapper<{}>;
  RichText: ResolverTypeWrapper<RichText>;
  SEO: ResolverTypeWrapper<Omit<Seo, 'openGraph'> & { openGraph: ResolversTypes['OpenGraphMetadata'] }>;
  SelectedOption: ResolverTypeWrapper<Omit<SelectedOption, 'option' | 'optionValue'> & { option: ResolversTypes['ProductOption'], optionValue: ResolversTypes['ProductOptionValue'] }>;
  SelectedOptionInput: SelectedOptionInput;
  Tag: ResolverTypeWrapper<Tag>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UnsignedInt64: ResolverTypeWrapper<Scalars['UnsignedInt64']['output']>;
  UserError: ResolverTypeWrapper<UserError>;
  Vendor: ResolverTypeWrapper<Vendor>;
  Video: ResolverTypeWrapper<Video>;
  Weight: ResolverTypeWrapper<Weight>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Category: Omit<Category, 'ancestors' | 'description' | 'excerpt' | 'featuredMedia' | 'media' | 'parent' | 'seo'> & { ancestors: Array<ResolversParentTypes['Category']>, description?: Maybe<ResolversParentTypes['RichText']>, excerpt?: Maybe<ResolversParentTypes['RichText']>, featuredMedia?: Maybe<ResolversParentTypes['Media']>, media: ResolversParentTypes['CategoryMediaConnection'], parent?: Maybe<ResolversParentTypes['Category']>, seo: ResolversParentTypes['SEO'] };
  Int: Scalars['Int']['output'];
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  CategoryConnection: Omit<CategoryConnection, 'nodes'> & { nodes: Array<ResolversParentTypes['Category']> };
  CategoryEdge: Omit<CategoryEdge, 'node'> & { node: ResolversParentTypes['Category'] };
  CategoryMediaConnection: Omit<CategoryMediaConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['CategoryMediaEdge']>, nodes: Array<ResolversParentTypes['Media']> };
  CategoryMediaEdge: Omit<CategoryMediaEdge, 'node'> & { node: ResolversParentTypes['Media'] };
  Color: Scalars['Color']['output'];
  Connection: ResolversInterfaceTypes<ResolversParentTypes>['Connection'];
  Cursor: Scalars['Cursor']['output'];
  Customer: Omit<Customer, 'productComparisons'> & { productComparisons: ResolversParentTypes['ProductComparisonConnection'] };
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  Dimensions: Dimensions;
  Float: Scalars['Float']['output'];
  DisplayableError: ResolversInterfaceTypes<ResolversParentTypes>['DisplayableError'];
  Email: Scalars['Email']['output'];
  ExternalVideo: ExternalVideo;
  HTML: Scalars['HTML']['output'];
  ISO8601DateTime: Scalars['ISO8601DateTime']['output'];
  InventoryItem: Omit<InventoryItem, 'variant'> & { variant: ResolversParentTypes['ProductVariant'] };
  Boolean: Scalars['Boolean']['output'];
  JSON: Scalars['JSON']['output'];
  Media: ResolversInterfaceTypes<ResolversParentTypes>['Media'];
  MediaImage: MediaImage;
  Model3d: Model3d;
  Money: Money;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  OpenGraphMetadata: Omit<OpenGraphMetadata, 'image'> & { image?: Maybe<ResolversParentTypes['Media']> };
  PageInfo: PageInfo;
  Product: Omit<Product, 'compareAtPriceRange' | 'description' | 'excerpt' | 'featuredMedia' | 'media' | 'options' | 'priceRange' | 'primaryCategory' | 'selectedOrFirstAvailableVariant' | 'seo' | 'variantBySelectedOptions' | 'variants'> & { compareAtPriceRange?: Maybe<ResolversParentTypes['ProductPriceRange']>, description?: Maybe<ResolversParentTypes['RichText']>, excerpt?: Maybe<ResolversParentTypes['RichText']>, featuredMedia?: Maybe<ResolversParentTypes['Media']>, media: ResolversParentTypes['ProductMediaConnection'], options: Array<ResolversParentTypes['ProductOption']>, priceRange?: Maybe<ResolversParentTypes['ProductPriceRange']>, primaryCategory?: Maybe<ResolversParentTypes['Category']>, selectedOrFirstAvailableVariant?: Maybe<ResolversParentTypes['ProductVariant']>, seo: ResolversParentTypes['SEO'], variantBySelectedOptions?: Maybe<ResolversParentTypes['ProductVariant']>, variants: ResolversParentTypes['ProductVariantConnection'] };
  ProductComparison: Omit<ProductComparison, 'category' | 'columns'> & { category: ResolversParentTypes['Category'], columns: ResolversParentTypes['ProductComparisonColumnConnection'] };
  ProductComparisonCell: ProductComparisonCell;
  ProductComparisonColumn: Omit<ProductComparisonColumn, 'compareAtPrice' | 'featuredMedia' | 'price' | 'product' | 'variant'> & { compareAtPrice?: Maybe<ResolversParentTypes['Money']>, featuredMedia?: Maybe<ResolversParentTypes['Media']>, price?: Maybe<ResolversParentTypes['Money']>, product: ResolversParentTypes['Product'], variant: ResolversParentTypes['ProductVariant'] };
  ProductComparisonColumnConnection: Omit<ProductComparisonColumnConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ProductComparisonColumnEdge']>, nodes: Array<ResolversParentTypes['ProductComparisonColumn']> };
  ProductComparisonColumnEdge: Omit<ProductComparisonColumnEdge, 'node'> & { node: ResolversParentTypes['ProductComparisonColumn'] };
  ProductComparisonConnection: Omit<ProductComparisonConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ProductComparisonEdge']>, nodes: Array<ResolversParentTypes['ProductComparison']> };
  ProductComparisonEdge: Omit<ProductComparisonEdge, 'node'> & { node: ResolversParentTypes['ProductComparison'] };
  ProductComparisonGroup: ProductComparisonGroup;
  ProductComparisonRow: ProductComparisonRow;
  ProductComponentConfiguration: Omit<ProductComponentConfiguration, 'componentsSubtotal' | 'groups' | 'totalPrice'> & { componentsSubtotal: ResolversParentTypes['Money'], groups: Array<ResolversParentTypes['ProductComponentGroup']>, totalPrice: ResolversParentTypes['Money'] };
  ProductComponentGroup: Omit<ProductComponentGroup, 'items'> & { items: Array<ResolversParentTypes['ProductComponentItem']> };
  ProductComponentItem: Omit<ProductComponentItem, 'featuredMedia' | 'product' | 'totalPrice' | 'unitPrice' | 'variant'> & { featuredMedia?: Maybe<ResolversParentTypes['Media']>, product: ResolversParentTypes['Product'], totalPrice: ResolversParentTypes['Money'], unitPrice: ResolversParentTypes['Money'], variant: ResolversParentTypes['ProductVariant'] };
  ProductComponentSelectionInput: ProductComponentSelectionInput;
  ProductFeature: ProductFeature;
  ProductFeatureGroup: ProductFeatureGroup;
  ProductFeatureValue: ProductFeatureValue;
  ProductMediaConnection: Omit<ProductMediaConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ProductMediaEdge']>, nodes: Array<ResolversParentTypes['Media']> };
  ProductMediaEdge: Omit<ProductMediaEdge, 'node'> & { node: ResolversParentTypes['Media'] };
  ProductOption: Omit<ProductOption, 'category' | 'optionValues'> & { category: ResolversParentTypes['ProductOptionCategory'], optionValues: Array<ResolversParentTypes['ProductOptionValue']> };
  ProductOptionCategory: ProductOptionCategory;
  ProductOptionValue: Omit<ProductOptionValue, 'swatch'> & { swatch?: Maybe<ResolversParentTypes['ProductOptionValueSwatch']> };
  ProductOptionValueSwatch: Omit<ProductOptionValueSwatch, 'image'> & { image?: Maybe<ResolversParentTypes['Media']> };
  ProductPriceRange: Omit<ProductPriceRange, 'maxVariantPrice' | 'minVariantPrice'> & { maxVariantPrice: ResolversParentTypes['Money'], minVariantPrice: ResolversParentTypes['Money'] };
  ProductVariant: Omit<ProductVariant, 'compareAtPrice' | 'componentConfiguration' | 'featuredMedia' | 'inventoryItem' | 'media' | 'price' | 'product' | 'selectedOptions'> & { compareAtPrice?: Maybe<ResolversParentTypes['Money']>, componentConfiguration?: Maybe<ResolversParentTypes['ProductComponentConfiguration']>, featuredMedia?: Maybe<ResolversParentTypes['Media']>, inventoryItem?: Maybe<ResolversParentTypes['InventoryItem']>, media: ResolversParentTypes['ProductVariantMediaConnection'], price?: Maybe<ResolversParentTypes['Money']>, product: ResolversParentTypes['Product'], selectedOptions: Array<ResolversParentTypes['SelectedOption']> };
  ProductVariantConnection: Omit<ProductVariantConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ProductVariantEdge']>, nodes: Array<ResolversParentTypes['ProductVariant']> };
  ProductVariantEdge: Omit<ProductVariantEdge, 'node'> & { node: ResolversParentTypes['ProductVariant'] };
  ProductVariantMediaConnection: Omit<ProductVariantMediaConnection, 'edges' | 'nodes'> & { edges: Array<ResolversParentTypes['ProductVariantMediaEdge']>, nodes: Array<ResolversParentTypes['Media']> };
  ProductVariantMediaEdge: Omit<ProductVariantMediaEdge, 'node'> & { node: ResolversParentTypes['Media'] };
  Query: {};
  RichText: RichText;
  SEO: Omit<Seo, 'openGraph'> & { openGraph: ResolversParentTypes['OpenGraphMetadata'] };
  SelectedOption: Omit<SelectedOption, 'option' | 'optionValue'> & { option: ResolversParentTypes['ProductOption'], optionValue: ResolversParentTypes['ProductOptionValue'] };
  SelectedOptionInput: SelectedOptionInput;
  Tag: Tag;
  URL: Scalars['URL']['output'];
  UnsignedInt64: Scalars['UnsignedInt64']['output'];
  UserError: UserError;
  Vendor: Vendor;
  Video: Video;
  Weight: Weight;
}>;

export type CategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Category']>, { __typename: 'Category' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  ancestors?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  children?: Resolver<ResolversTypes['CategoryConnection'], ParentType, ContextType, Partial<CategoryChildrenArgs>>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  excerpt?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  featuredMedia?: Resolver<Maybe<ResolversTypes['Media']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  media?: Resolver<ResolversTypes['CategoryMediaConnection'], ParentType, ContextType, Partial<CategoryMediaArgs>>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  publishedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  seo?: Resolver<ResolversTypes['SEO'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryConnection'] = ResolversParentTypes['CategoryConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CategoryEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryEdge'] = ResolversParentTypes['CategoryEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Category'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryMediaConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryMediaConnection'] = ResolversParentTypes['CategoryMediaConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CategoryMediaEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Media']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryMediaEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryMediaEdge'] = ResolversParentTypes['CategoryMediaEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Media'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ColorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Color'], any> {
  name: 'Color';
}

export type ConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'CategoryConnection' | 'CategoryMediaConnection' | 'ProductComparisonColumnConnection' | 'ProductComparisonConnection' | 'ProductMediaConnection' | 'ProductVariantConnection' | 'ProductVariantMediaConnection', ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export interface CursorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  productComparisons?: Resolver<ResolversTypes['ProductComparisonConnection'], { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, Partial<CustomerProductComparisonsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface DecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export type DimensionsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Dimensions'] = ResolversParentTypes['Dimensions']> = ResolversObject<{
  height?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DisplayableErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DisplayableError'] = ResolversParentTypes['DisplayableError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'UserError', ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type ExternalVideoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ExternalVideo'] = ResolversParentTypes['ExternalVideo']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ExternalVideo']>, { __typename: 'ExternalVideo' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface HtmlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['HTML'], any> {
  name: 'HTML';
}

export interface Iso8601DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ISO8601DateTime'], any> {
  name: 'ISO8601DateTime';
}

export type InventoryItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItem'] = ResolversParentTypes['InventoryItem']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['InventoryItem']>, { __typename: 'InventoryItem' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  availableForSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  currentlyNotInStock?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inventoryPolicy?: Resolver<ResolversTypes['ProductVariantInventoryPolicy'], ParentType, ContextType>;
  quantityAvailable?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  requiresShipping?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tracked?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  variant?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MediaResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Media'] = ResolversParentTypes['Media']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ExternalVideo' | 'MediaImage' | 'Model3d' | 'Video', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type MediaImageResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MediaImage'] = ResolversParentTypes['MediaImage']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['MediaImage']>, { __typename: 'MediaImage' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Model3dResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Model3d'] = ResolversParentTypes['Model3d']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Model3d']>, { __typename: 'Model3d' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MoneyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _catalog?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Category' | 'InventoryItem' | 'Product' | 'ProductFeature' | 'ProductFeatureGroup' | 'ProductFeatureValue' | 'ProductOption' | 'ProductOptionCategory' | 'ProductOptionValue' | 'ProductVariant' | 'Tag' | 'Vendor', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type OpenGraphMetadataResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OpenGraphMetadata'] = ResolversParentTypes['OpenGraphMetadata']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['Media']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['Cursor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  availableForSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  categories?: Resolver<ResolversTypes['CategoryConnection'], ParentType, ContextType, Partial<ProductCategoriesArgs>>;
  compareAtPriceRange?: Resolver<Maybe<ResolversTypes['ProductPriceRange']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  excerpt?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  featureGroups?: Resolver<Array<ResolversTypes['ProductFeatureGroup']>, ParentType, ContextType>;
  featuredMedia?: Resolver<Maybe<ResolversTypes['Media']>, ParentType, ContextType>;
  features?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  media?: Resolver<ResolversTypes['ProductMediaConnection'], ParentType, ContextType, Partial<ProductMediaArgs>>;
  options?: Resolver<Array<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  priceRange?: Resolver<Maybe<ResolversTypes['ProductPriceRange']>, ParentType, ContextType>;
  primaryCategory?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  publishedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  selectedOrFirstAvailableVariant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType, Partial<ProductSelectedOrFirstAvailableVariantArgs>>;
  seo?: Resolver<ResolversTypes['SEO'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalInventory?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variantBySelectedOptions?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType, RequireFields<ProductVariantBySelectedOptionsArgs, 'selectedOptions'>>;
  variants?: Resolver<ResolversTypes['ProductVariantConnection'], ParentType, ContextType, Partial<ProductVariantsArgs>>;
  vendor?: Resolver<Maybe<ResolversTypes['Vendor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparison'] = ResolversParentTypes['ProductComparison']> = ResolversObject<{
  category?: Resolver<ResolversTypes['Category'], ParentType, ContextType>;
  columns?: Resolver<ResolversTypes['ProductComparisonColumnConnection'], ParentType, ContextType, Partial<ProductComparisonColumnsArgs>>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonCellResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonCell'] = ResolversParentTypes['ProductComparisonCell']> = ResolversObject<{
  displayValue?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProductComparisonCellStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonColumnResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonColumn'] = ResolversParentTypes['ProductComparisonColumn']> = ResolversObject<{
  availableForSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  compareAtPrice?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  featuredMedia?: Resolver<Maybe<ResolversTypes['Media']>, ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  variant?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonColumnConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonColumnConnection'] = ResolversParentTypes['ProductComparisonColumnConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductComparisonColumnEdge']>, ParentType, ContextType>;
  groups?: Resolver<Array<ResolversTypes['ProductComparisonGroup']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ProductComparisonColumn']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonColumnEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonColumnEdge'] = ResolversParentTypes['ProductComparisonColumnEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductComparisonColumn'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonConnection'] = ResolversParentTypes['ProductComparisonConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductComparisonEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ProductComparison']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonEdge'] = ResolversParentTypes['ProductComparisonEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductComparison'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonGroup'] = ResolversParentTypes['ProductComparisonGroup']> = ResolversObject<{
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rows?: Resolver<Array<ResolversTypes['ProductComparisonRow']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComparisonRowResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComparisonRow'] = ResolversParentTypes['ProductComparisonRow']> = ResolversObject<{
  cells?: Resolver<Array<ResolversTypes['ProductComparisonCell']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasDifferences?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComponentConfigurationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComponentConfiguration'] = ResolversParentTypes['ProductComponentConfiguration']> = ResolversObject<{
  componentsSubtotal?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  displayStyle?: Resolver<ResolversTypes['ProductComponentDisplayStyle'], ParentType, ContextType>;
  groups?: Resolver<Array<ResolversTypes['ProductComponentGroup']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  totalPrice?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComponentGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComponentGroup'] = ResolversParentTypes['ProductComponentGroup']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['ProductComponentItem']>, ParentType, ContextType>;
  maxSelection?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minSelection?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductComponentItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductComponentItem'] = ResolversParentTypes['ProductComponentItem']> = ResolversObject<{
  availableForSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  featuredMedia?: Resolver<Maybe<ResolversTypes['Media']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  maxQuantity?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minQuantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  selected?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalPrice?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  unitPrice?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  variant?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeature'] = ResolversParentTypes['ProductFeature']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductFeature']>, { __typename: 'ProductFeature' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  featured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['ProductFeatureGroup']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['ProductFeatureValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureGroup'] = ResolversParentTypes['ProductFeatureGroup']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductFeatureGroup']>, { __typename: 'ProductFeatureGroup' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  featured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  features?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureValue'] = ResolversParentTypes['ProductFeatureValue']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductFeatureValue']>, { __typename: 'ProductFeatureValue' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  feature?: Resolver<ResolversTypes['ProductFeature'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductMediaConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductMediaConnection'] = ResolversParentTypes['ProductMediaConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductMediaEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Media']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductMediaEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductMediaEdge'] = ResolversParentTypes['ProductMediaEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Media'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOption'] = ResolversParentTypes['ProductOption']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOption']>, { __typename: 'ProductOption' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  category?: Resolver<ResolversTypes['ProductOptionCategory'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  optionValues?: Resolver<Array<ResolversTypes['ProductOptionValue']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionCategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionCategory'] = ResolversParentTypes['ProductOptionCategory']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOptionCategory']>, { __typename: 'ProductOptionCategory' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionValue'] = ResolversParentTypes['ProductOptionValue']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOptionValue']>, { __typename: 'ProductOptionValue' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['ProductOptionValueSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionValueSwatchResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionValueSwatch'] = ResolversParentTypes['ProductOptionValueSwatch']> = ResolversObject<{
  color?: Resolver<Maybe<ResolversTypes['Color']>, ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes['Media']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  secondaryColor?: Resolver<Maybe<ResolversTypes['Color']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ProductOptionSwatchType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductPriceRangeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductPriceRange'] = ResolversParentTypes['ProductPriceRange']> = ResolversObject<{
  maxVariantPrice?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  minVariantPrice?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductVariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductVariant'] = ResolversParentTypes['ProductVariant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductVariant']>, { __typename: 'ProductVariant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  availableForSale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  compareAtPrice?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  componentConfiguration?: Resolver<Maybe<ResolversTypes['ProductComponentConfiguration']>, ParentType, ContextType, Partial<ProductVariantComponentConfigurationArgs>>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currentlyNotInStock?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  dimensions?: Resolver<Maybe<ResolversTypes['Dimensions']>, ParentType, ContextType>;
  featuredMedia?: Resolver<Maybe<ResolversTypes['Media']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inventoryItem?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  media?: Resolver<ResolversTypes['ProductVariantMediaConnection'], ParentType, ContextType, Partial<ProductVariantMediaArgs>>;
  price?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  quantityAvailable?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  requiresShipping?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  selectedOptions?: Resolver<Array<ResolversTypes['SelectedOption']>, ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  weight?: Resolver<Maybe<ResolversTypes['Weight']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductVariantConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductVariantConnection'] = ResolversParentTypes['ProductVariantConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductVariantEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ProductVariant']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductVariantEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductVariantEdge'] = ResolversParentTypes['ProductVariantEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductVariant'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductVariantMediaConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductVariantMediaConnection'] = ResolversParentTypes['ProductVariantMediaConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductVariantMediaEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Media']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductVariantMediaEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductVariantMediaEdge'] = ResolversParentTypes['ProductVariantMediaEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Media'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  categories?: Resolver<ResolversTypes['CategoryConnection'], ParentType, ContextType, Partial<QueryCategoriesArgs>>;
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType, RequireFields<QueryCategoryArgs, 'id'>>;
  categoryByHandle?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType, RequireFields<QueryCategoryByHandleArgs, 'handle'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<QueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<QueryNodesArgs, 'ids'>>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryProductArgs, 'id'>>;
  productByHandle?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryProductByHandleArgs, 'handle'>>;
  productComparison?: Resolver<Maybe<ResolversTypes['ProductComparison']>, ParentType, ContextType, RequireFields<QueryProductComparisonArgs, 'variantIds'>>;
  productVariant?: Resolver<Maybe<ResolversTypes['ProductVariant']>, ParentType, ContextType, RequireFields<QueryProductVariantArgs, 'id'>>;
}>;

export type RichTextResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RichText'] = ResolversParentTypes['RichText']> = ResolversObject<{
  html?: Resolver<ResolversTypes['HTML'], ParentType, ContextType>;
  json?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SeoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SEO'] = ResolversParentTypes['SEO']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  openGraph?: Resolver<ResolversTypes['OpenGraphMetadata'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SelectedOptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SelectedOption'] = ResolversParentTypes['SelectedOption']> = ResolversObject<{
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  option?: Resolver<ResolversTypes['ProductOption'], ParentType, ContextType>;
  optionValue?: Resolver<ResolversTypes['ProductOptionValue'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Tag']>, { __typename: 'Tag' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UrlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['URL'], any> {
  name: 'URL';
}

export interface UnsignedInt64ScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['UnsignedInt64'], any> {
  name: 'UnsignedInt64';
}

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VendorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Vendor'] = ResolversParentTypes['Vendor']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Vendor']>, { __typename: 'Vendor' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VideoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Video'] = ResolversParentTypes['Video']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Video']>, { __typename: 'Video' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Weight'] = ResolversParentTypes['Weight']> = ResolversObject<{
  unit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  Category?: CategoryResolvers<ContextType>;
  CategoryConnection?: CategoryConnectionResolvers<ContextType>;
  CategoryEdge?: CategoryEdgeResolvers<ContextType>;
  CategoryMediaConnection?: CategoryMediaConnectionResolvers<ContextType>;
  CategoryMediaEdge?: CategoryMediaEdgeResolvers<ContextType>;
  Color?: GraphQLScalarType;
  Connection?: ConnectionResolvers<ContextType>;
  Cursor?: GraphQLScalarType;
  Customer?: CustomerResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Decimal?: GraphQLScalarType;
  Dimensions?: DimensionsResolvers<ContextType>;
  DisplayableError?: DisplayableErrorResolvers<ContextType>;
  Email?: GraphQLScalarType;
  ExternalVideo?: ExternalVideoResolvers<ContextType>;
  HTML?: GraphQLScalarType;
  ISO8601DateTime?: GraphQLScalarType;
  InventoryItem?: InventoryItemResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Media?: MediaResolvers<ContextType>;
  MediaImage?: MediaImageResolvers<ContextType>;
  Model3d?: Model3dResolvers<ContextType>;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  OpenGraphMetadata?: OpenGraphMetadataResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductComparison?: ProductComparisonResolvers<ContextType>;
  ProductComparisonCell?: ProductComparisonCellResolvers<ContextType>;
  ProductComparisonColumn?: ProductComparisonColumnResolvers<ContextType>;
  ProductComparisonColumnConnection?: ProductComparisonColumnConnectionResolvers<ContextType>;
  ProductComparisonColumnEdge?: ProductComparisonColumnEdgeResolvers<ContextType>;
  ProductComparisonConnection?: ProductComparisonConnectionResolvers<ContextType>;
  ProductComparisonEdge?: ProductComparisonEdgeResolvers<ContextType>;
  ProductComparisonGroup?: ProductComparisonGroupResolvers<ContextType>;
  ProductComparisonRow?: ProductComparisonRowResolvers<ContextType>;
  ProductComponentConfiguration?: ProductComponentConfigurationResolvers<ContextType>;
  ProductComponentGroup?: ProductComponentGroupResolvers<ContextType>;
  ProductComponentItem?: ProductComponentItemResolvers<ContextType>;
  ProductFeature?: ProductFeatureResolvers<ContextType>;
  ProductFeatureGroup?: ProductFeatureGroupResolvers<ContextType>;
  ProductFeatureValue?: ProductFeatureValueResolvers<ContextType>;
  ProductMediaConnection?: ProductMediaConnectionResolvers<ContextType>;
  ProductMediaEdge?: ProductMediaEdgeResolvers<ContextType>;
  ProductOption?: ProductOptionResolvers<ContextType>;
  ProductOptionCategory?: ProductOptionCategoryResolvers<ContextType>;
  ProductOptionValue?: ProductOptionValueResolvers<ContextType>;
  ProductOptionValueSwatch?: ProductOptionValueSwatchResolvers<ContextType>;
  ProductPriceRange?: ProductPriceRangeResolvers<ContextType>;
  ProductVariant?: ProductVariantResolvers<ContextType>;
  ProductVariantConnection?: ProductVariantConnectionResolvers<ContextType>;
  ProductVariantEdge?: ProductVariantEdgeResolvers<ContextType>;
  ProductVariantMediaConnection?: ProductVariantMediaConnectionResolvers<ContextType>;
  ProductVariantMediaEdge?: ProductVariantMediaEdgeResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RichText?: RichTextResolvers<ContextType>;
  SEO?: SeoResolvers<ContextType>;
  SelectedOption?: SelectedOptionResolvers<ContextType>;
  Tag?: TagResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnsignedInt64?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
  Vendor?: VendorResolvers<ContextType>;
  Video?: VideoResolvers<ContextType>;
  Weight?: WeightResolvers<ContextType>;
}>;

