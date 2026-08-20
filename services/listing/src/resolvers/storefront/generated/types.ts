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

/**
 * Variant-witness availability used by the canonical listing algebra.
 *
 * A product containing both available and unavailable variants can match both
 * states. Every other active variant filter remains applied to the witness.
 */
export enum Availability {
  Available = 'AVAILABLE',
  Unavailable = 'UNAVAILABLE'
}

export type Category = {
  __typename?: 'Category';
  id: Scalars['ID']['output'];
  /**
   * Products published in this category.
   *
   * When query is provided, text search is applied inside the category scope.
   * With no query the contextual default sort is MANUAL. With a non-empty query
   * it is RELEVANCE.
   */
  products: ProductConnection;
};


export type CategoryProductsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  filters?: InputMaybe<Array<ListingFilterInput>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ListingSort>;
};

export type Collection = {
  __typename?: 'Collection';
  id: Scalars['ID']['output'];
  listingRevision: Scalars['Int']['output'];
  products: ProductConnection;
};


export type CollectionProductsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  filters?: InputMaybe<Array<ListingFilterInput>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<ListingSort>;
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

/** A configured listing facet owned by the Listing service. */
export type Facet = Node & {
  __typename?: 'Facet';
  facetType: FacetType;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  selectionMode: FacetSelectionMode;
  slug: Scalars['String']['output'];
  uiType: FacetUiType;
};

export type FacetFilterInput = {
  /** Public facet handle, for example `color` or `material`. */
  facet: Scalars['String']['input'];
  /** Public facet value handle, for example `blue` or `cotton`. */
  value: Scalars['String']['input'];
};

export enum FacetSelectionMode {
  Multi = 'MULTI',
  Single = 'SINGLE'
}

/**
 * Canonical color or gradient metadata associated with a facet value. Image
 * swatches are not exposed until the Media storefront entity path is available.
 */
export type FacetSwatch = Node & {
  __typename?: 'FacetSwatch';
  colorOne: Maybe<Scalars['String']['output']>;
  colorTwo: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  swatchType: SwatchType;
};

export enum FacetType {
  Feature = 'FEATURE',
  InStock = 'IN_STOCK',
  Option = 'OPTION',
  Price = 'PRICE',
  Tag = 'TAG'
}

export enum FacetUiType {
  Boolean = 'BOOLEAN',
  Checkbox = 'CHECKBOX',
  Dropdown = 'DROPDOWN',
  Radio = 'RADIO',
  Range = 'RANGE'
}

/** A configured value belonging to a canonical listing facet. */
export type FacetValue = Node & {
  __typename?: 'FacetValue';
  facet: Facet;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: FacetValueKind;
  label: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  swatch: Maybe<FacetSwatch>;
};

export enum FacetValueKind {
  Group = 'GROUP',
  Source = 'SOURCE'
}

/**
 * A filter available for the current result set.
 *
 * The input of each FilterValue is a JSON object matching ListingFilterInput and
 * can be passed unchanged into the filters argument of the next request.
 */
export type Filter = {
  __typename?: 'Filter';
  /**
   * The configured canonical facet represented by this filter.
   * Null for virtual availability and price filters.
   */
  facet: Maybe<Facet>;
  /** Stable public identifier within the storefront listing contract. */
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  /** Preferred visual representation of filter values. */
  presentation: Maybe<FilterPresentation>;
  /** Typed bounds and active selection for a PRICE_RANGE filter. */
  priceRange: Maybe<FilterPriceRange>;
  /**
   * The selection behavior configured on facet. Null for virtual filters, whose
   * behavior is determined by Filter.type.
   */
  selectionMode: Maybe<FacetSelectionMode>;
  type: FilterType;
  /** Selectable values and reusable inputs for this filter. */
  values: Array<FilterValue>;
};

export enum FilterPresentation {
  Swatch = 'SWATCH',
  Text = 'TEXT'
}

/** Store-currency price metadata expressed in decimal major units. */
export type FilterPriceRange = {
  __typename?: 'FilterPriceRange';
  max: Money;
  min: Money;
  selectedMax: Maybe<Money>;
  selectedMin: Maybe<Money>;
};

export enum FilterType {
  Boolean = 'BOOLEAN',
  List = 'LIST',
  PriceRange = 'PRICE_RANGE'
}

export type FilterValue = {
  __typename?: 'FilterValue';
  /**
   * Number of distinct matching products after target-filter isolation.
   * Selected values remain present when their count is zero.
   */
  count: Scalars['Int']['output'];
  /**
   * The configured canonical facet value represented by this result value.
   * Null for virtual availability and price values.
   */
  facetValue: Maybe<FacetValue>;
  /** Stable identifier within the parent filter. */
  id: Scalars['String']['output'];
  /** A JSON object matching ListingFilterInput that can be reused in filters. */
  input: Scalars['JSON']['output'];
  label: Scalars['String']['output'];
  selected: Scalars['Boolean']['output'];
  /** Canonical swatch associated with facetValue, when configured. */
  swatch: Maybe<FacetSwatch>;
};

/**
 * One structured listing predicate.
 *
 * Exactly one field must be provided. Different filter kinds are combined with
 * AND. Repeated values of the same filter are combined with OR. Variant facets,
 * price, and availability are evaluated against the same variant.
 */
export type ListingFilterInput = {
  availability?: InputMaybe<Availability>;
  facet?: InputMaybe<FacetFilterInput>;
  price?: InputMaybe<PriceRangeFilterInput>;
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * Deterministic storefront product sorting.
 *
 * Availability placement is controlled by listing/search policy and is not
 * reversed by the selected product sort.
 */
export enum ListingSort {
  /** Creation date descending. Available in global, category, and query contexts. */
  CreatedAt = 'CREATED_AT',
  /** Merchant-defined order. Available only in category scope. */
  Manual = 'MANUAL',
  /** Published date descending. Available in global, category, and query contexts. */
  Newest = 'NEWEST',
  /** Storefront price ascending. Available in global, category, and query contexts. */
  PriceAsc = 'PRICE_ASC',
  /** Storefront price descending. Available in global, category, and query contexts. */
  PriceDesc = 'PRICE_DESC',
  /** Search relevance. Available when a query is active in any scope. */
  Relevance = 'RELEVANCE',
  /** Localized title ascending. Available in global, category, and query contexts. */
  TitleAsc = 'TITLE_ASC',
  /** Localized title descending. Available in global, category, and query contexts. */
  TitleDesc = 'TITLE_DESC'
}

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

/** A precise monetary value with its associated currency. */
export type Money = {
  __typename?: 'Money';
  amount: Scalars['Decimal']['output'];
  currencyCode: CurrencyCode;
};

export type Mutation = {
  __typename?: 'Mutation';
  _listing: Maybe<Scalars['Boolean']['output']>;
};

/** Enables global object identification following the Relay specification. */
export type Node = {
  id: Scalars['ID']['output'];
};

/** Returns information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['Cursor']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['Cursor']['output']>;
};

/**
 * Price bounds in decimal major units and in the storefront context currency.
 * For example, 19.99 represents nineteen currency units and ninety-nine cents.
 */
export type PriceRangeFilterInput = {
  max?: InputMaybe<Scalars['Decimal']['input']>;
  min?: InputMaybe<Scalars['Decimal']['input']>;
};

export type Product = {
  __typename?: 'Product';
  /**
   * Products that customers frequently bought together with this product.
   *
   * Results come from confirmed sales aggregated into the currently published
   * FREQUENTLY_BOUGHT_TOGETHER ranking snapshot. This field does not imply a
   * bundle, discount, price guarantee, compatibility claim, or cart mutation.
   * Clients choose concrete variants and use Checkout APIs for add-to-cart.
   */
  frequentlyBoughtTogether: ProductRecommendationConnection;
  id: Scalars['ID']['output'];
  /**
   * Merchant-curated and automatically ranked products related to this product.
   *
   * Results come from the currently published PRODUCT_RELATED ranking snapshot.
   * The connection is already ordered for presentation, so clients should render
   * the returned order unchanged. An empty connection is a valid, cacheable
   * result and does not trigger a synchronous recommendation calculation.
   */
  relatedProducts: ProductRecommendationConnection;
};


export type ProductFrequentlyBoughtTogetherArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type ProductRelatedProductsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

/** A Relay connection containing products from one canonical listing request. */
export type ProductConnection = Connection & {
  __typename?: 'ProductConnection';
  /**
   * Sorts valid for this context. MANUAL is available for categories and manual
   * collections. RELEVANCE is returned only when a non-empty query is active.
   */
  availableSorts: Array<ListingSort>;
  /** A list of product edges. */
  edges: Array<ProductEdge>;
  /**
   * Filters calculated over the complete matched result set, not only this page.
   *
   * Each count uses target-filter isolation: selections from the filter being
   * counted are excluded while every other filter remains active.
   */
  filters: Array<Filter>;
  /** The products contained in the returned edges. */
  nodes: Array<Product>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The effective sort selected for this request. */
  sort: ListingSort;
  /** The exact number of products matching every active filter. */
  totalCount: Scalars['Int']['output'];
};

export type ProductEdge = {
  __typename?: 'ProductEdge';
  /** An opaque cursor for this product in the current listing. */
  cursor: Scalars['Cursor']['output'];
  /** The product at the end of the edge. */
  node: Product;
};

/**
 * One ranked recommendation and the public provenance needed by storefront
 * presentation and analytics. Internal scores and ranking features are not part
 * of the storefront contract.
 */
export type ProductRecommendation = {
  __typename?: 'ProductRecommendation';
  /** Current federated Product presentation resolved by Catalog. */
  product: Product;
  /** Primary source that contributed this recommendation. */
  source: ProductRecommendationSource;
};

/**
 * A forward-only Relay connection over one immutable recommendation snapshot.
 *
 * The cursor pins the snapshot generation, so pagination never combines ranks
 * from two different recommendation builds. Products that are no longer
 * storefront-eligible are omitted at read time without changing the snapshot.
 */
export type ProductRecommendationConnection = Connection & {
  __typename?: 'ProductRecommendationConnection';
  /** Recommendation edges in their published display order. */
  edges: Array<ProductRecommendationEdge>;
  /** Recommendations contained in the returned edges. */
  nodes: Array<ProductRecommendation>;
  /** Information to aid in forward pagination. */
  pageInfo: PageInfo;
  /** Number of currently storefront-eligible items in the resolved snapshot. */
  totalCount: Scalars['Int']['output'];
};

export type ProductRecommendationEdge = {
  __typename?: 'ProductRecommendationEdge';
  /** Opaque cursor tied to the snapshot generation and published rank. */
  cursor: Scalars['Cursor']['output'];
  /** The recommendation at the end of the edge. */
  node: ProductRecommendation;
};

export enum ProductRecommendationSource {
  /** Similarity calculated from product content or taxonomy. */
  ContentSimilarity = 'CONTENT_SIMILARITY',
  /** Configured cold-start fallback source. */
  Fallback = 'FALLBACK',
  /** Association calculated from confirmed sales. */
  FrequentlyBoughtTogether = 'FREQUENTLY_BOUGHT_TOGETHER',
  /** Explicit merchant recommendation. */
  Manual = 'MANUAL',
  /** Store or category popularity signal. */
  Popularity = 'POPULARITY'
}

export type Query = {
  __typename?: 'Query';
  /**
   * Returns published products from the GLOBAL listing scope.
   *
   * The result uses the locale, currency, market, channel, and publication rules
   * from the active storefront context. Facets configured for SEARCH scope are
   * exposed because this request has no category context. The default sort is
   * NEWEST; MANUAL and RELEVANCE are not valid for this entry point.
   */
  products: ProductConnection;
  /**
   * Search published products.
   *
   * Search uses the locale and currency from the active storefront context. The
   * query must contain 1-128 Unicode code points after whitespace normalization.
   * The contextual default sort is RELEVANCE.
   */
  searchProducts: ProductConnection;
};


export type QueryProductsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  filters?: InputMaybe<Array<ListingFilterInput>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ListingSort>;
};


export type QuerySearchProductsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  filters?: InputMaybe<Array<ListingFilterInput>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
  sort?: InputMaybe<ListingSort>;
};

/** Localized rich text in plain text, HTML, and structured JSON formats. */
export type RichText = {
  __typename?: 'RichText';
  html: Scalars['HTML']['output'];
  json: Scalars['JSON']['output'];
  text: Scalars['String']['output'];
};

export enum SwatchType {
  Color = 'COLOR',
  Gradient = 'GRADIENT'
}

/** Represents a generic error in the input of a mutation. */
export type UserError = DisplayableError & {
  __typename?: 'UserError';
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
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
  Connection: ( ProductConnection ) | ( ProductRecommendationConnection );
  DisplayableError: ( UserError );
  Node: ( Facet ) | ( FacetSwatch ) | ( FacetValue );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Availability: Availability;
  Category: ResolverTypeWrapper<Category>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Collection: ResolverTypeWrapper<Collection>;
  Color: ResolverTypeWrapper<Scalars['Color']['output']>;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  CountryCode: CountryCode;
  CurrencyCode: CurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DimensionUnit: DimensionUnit;
  Dimensions: ResolverTypeWrapper<Dimensions>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  DisplayableError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['DisplayableError']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Facet: ResolverTypeWrapper<Facet>;
  FacetFilterInput: FacetFilterInput;
  FacetSelectionMode: FacetSelectionMode;
  FacetSwatch: ResolverTypeWrapper<FacetSwatch>;
  FacetType: FacetType;
  FacetUIType: FacetUiType;
  FacetValue: ResolverTypeWrapper<FacetValue>;
  FacetValueKind: FacetValueKind;
  Filter: ResolverTypeWrapper<Filter>;
  FilterPresentation: FilterPresentation;
  FilterPriceRange: ResolverTypeWrapper<FilterPriceRange>;
  FilterType: FilterType;
  FilterValue: ResolverTypeWrapper<FilterValue>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  HTML: ResolverTypeWrapper<Scalars['HTML']['output']>;
  ISO8601DateTime: ResolverTypeWrapper<Scalars['ISO8601DateTime']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  ListingFilterInput: ListingFilterInput;
  ListingSort: ListingSort;
  LocaleCode: LocaleCode;
  Money: ResolverTypeWrapper<Money>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PriceRangeFilterInput: PriceRangeFilterInput;
  Product: ResolverTypeWrapper<Product>;
  ProductConnection: ResolverTypeWrapper<ProductConnection>;
  ProductEdge: ResolverTypeWrapper<ProductEdge>;
  ProductRecommendation: ResolverTypeWrapper<ProductRecommendation>;
  ProductRecommendationConnection: ResolverTypeWrapper<ProductRecommendationConnection>;
  ProductRecommendationEdge: ResolverTypeWrapper<ProductRecommendationEdge>;
  ProductRecommendationSource: ProductRecommendationSource;
  Query: ResolverTypeWrapper<{}>;
  RichText: ResolverTypeWrapper<RichText>;
  SwatchType: SwatchType;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UnsignedInt64: ResolverTypeWrapper<Scalars['UnsignedInt64']['output']>;
  UserError: ResolverTypeWrapper<UserError>;
  Weight: ResolverTypeWrapper<Weight>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Category: Category;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  String: Scalars['String']['output'];
  Collection: Collection;
  Color: Scalars['Color']['output'];
  Connection: ResolversInterfaceTypes<ResolversParentTypes>['Connection'];
  Cursor: Scalars['Cursor']['output'];
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  Dimensions: Dimensions;
  Float: Scalars['Float']['output'];
  DisplayableError: ResolversInterfaceTypes<ResolversParentTypes>['DisplayableError'];
  Email: Scalars['Email']['output'];
  Facet: Facet;
  FacetFilterInput: FacetFilterInput;
  FacetSwatch: FacetSwatch;
  FacetValue: FacetValue;
  Filter: Filter;
  FilterPriceRange: FilterPriceRange;
  FilterValue: FilterValue;
  Boolean: Scalars['Boolean']['output'];
  HTML: Scalars['HTML']['output'];
  ISO8601DateTime: Scalars['ISO8601DateTime']['output'];
  JSON: Scalars['JSON']['output'];
  ListingFilterInput: ListingFilterInput;
  Money: Money;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  PriceRangeFilterInput: PriceRangeFilterInput;
  Product: Product;
  ProductConnection: ProductConnection;
  ProductEdge: ProductEdge;
  ProductRecommendation: ProductRecommendation;
  ProductRecommendationConnection: ProductRecommendationConnection;
  ProductRecommendationEdge: ProductRecommendationEdge;
  Query: {};
  RichText: RichText;
  URL: Scalars['URL']['output'];
  UnsignedInt64: Scalars['UnsignedInt64']['output'];
  UserError: UserError;
  Weight: Weight;
}>;

export type CategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Category']>, { __typename: 'Category' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  products?: Resolver<ResolversTypes['ProductConnection'], { __typename: 'Category' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<CategoryProductsArgs, 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Collection'] = ResolversParentTypes['Collection']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Collection']>, { __typename: 'Collection' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;


  products?: Resolver<ResolversTypes['ProductConnection'], { __typename: 'Collection' } & GraphQLRecursivePick<ParentType, {"id":true}> & GraphQLRecursivePick<ParentType, {"listingRevision":true}>, ContextType, RequireFields<CollectionProductsArgs, 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ColorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Color'], any> {
  name: 'Color';
}

export type ConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ProductConnection' | 'ProductRecommendationConnection', ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export interface CursorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

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

export type FacetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Facet'] = ResolversParentTypes['Facet']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Facet']>, { __typename: 'Facet' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  facetType?: Resolver<ResolversTypes['FacetType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  selectionMode?: Resolver<ResolversTypes['FacetSelectionMode'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  uiType?: Resolver<ResolversTypes['FacetUIType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatch'] = ResolversParentTypes['FacetSwatch']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['FacetSwatch']>, { __typename: 'FacetSwatch' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  colorOne?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  colorTwo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  swatchType?: Resolver<ResolversTypes['SwatchType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValue'] = ResolversParentTypes['FacetValue']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['FacetValue']>, { __typename: 'FacetValue' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  facet?: Resolver<ResolversTypes['Facet'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['FacetValueKind'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FilterResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Filter'] = ResolversParentTypes['Filter']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  presentation?: Resolver<Maybe<ResolversTypes['FilterPresentation']>, ParentType, ContextType>;
  priceRange?: Resolver<Maybe<ResolversTypes['FilterPriceRange']>, ParentType, ContextType>;
  selectionMode?: Resolver<Maybe<ResolversTypes['FacetSelectionMode']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['FilterType'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['FilterValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FilterPriceRangeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FilterPriceRange'] = ResolversParentTypes['FilterPriceRange']> = ResolversObject<{
  max?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  min?: Resolver<ResolversTypes['Money'], ParentType, ContextType>;
  selectedMax?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  selectedMin?: Resolver<Maybe<ResolversTypes['Money']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FilterValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FilterValue'] = ResolversParentTypes['FilterValue']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  input?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  selected?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface HtmlScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['HTML'], any> {
  name: 'HTML';
}

export interface Iso8601DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ISO8601DateTime'], any> {
  name: 'ISO8601DateTime';
}

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MoneyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Money'] = ResolversParentTypes['Money']> = ResolversObject<{
  amount?: Resolver<ResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _listing?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Facet' | 'FacetSwatch' | 'FacetValue', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
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
  frequentlyBoughtTogether?: Resolver<ResolversTypes['ProductRecommendationConnection'], { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<ProductFrequentlyBoughtTogetherArgs, 'first'>>;

  relatedProducts?: Resolver<ResolversTypes['ProductRecommendationConnection'], { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType, RequireFields<ProductRelatedProductsArgs, 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductConnection'] = ResolversParentTypes['ProductConnection']> = ResolversObject<{
  availableSorts?: Resolver<Array<ResolversTypes['ListingSort']>, ParentType, ContextType>;
  edges?: Resolver<Array<ResolversTypes['ProductEdge']>, ParentType, ContextType>;
  filters?: Resolver<Array<ResolversTypes['Filter']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Product']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  sort?: Resolver<ResolversTypes['ListingSort'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductEdge'] = ResolversParentTypes['ProductEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductRecommendationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductRecommendation'] = ResolversParentTypes['ProductRecommendation']> = ResolversObject<{
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['ProductRecommendationSource'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductRecommendationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductRecommendationConnection'] = ResolversParentTypes['ProductRecommendationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductRecommendationEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ProductRecommendation']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductRecommendationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductRecommendationEdge'] = ResolversParentTypes['ProductRecommendationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductRecommendation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  products?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, RequireFields<QueryProductsArgs, 'first' | 'sort'>>;
  searchProducts?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, RequireFields<QuerySearchProductsArgs, 'first' | 'query'>>;
}>;

export type RichTextResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RichText'] = ResolversParentTypes['RichText']> = ResolversObject<{
  html?: Resolver<ResolversTypes['HTML'], ParentType, ContextType>;
  json?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type WeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Weight'] = ResolversParentTypes['Weight']> = ResolversObject<{
  unit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  Category?: CategoryResolvers<ContextType>;
  Collection?: CollectionResolvers<ContextType>;
  Color?: GraphQLScalarType;
  Connection?: ConnectionResolvers<ContextType>;
  Cursor?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Decimal?: GraphQLScalarType;
  Dimensions?: DimensionsResolvers<ContextType>;
  DisplayableError?: DisplayableErrorResolvers<ContextType>;
  Email?: GraphQLScalarType;
  Facet?: FacetResolvers<ContextType>;
  FacetSwatch?: FacetSwatchResolvers<ContextType>;
  FacetValue?: FacetValueResolvers<ContextType>;
  Filter?: FilterResolvers<ContextType>;
  FilterPriceRange?: FilterPriceRangeResolvers<ContextType>;
  FilterValue?: FilterValueResolvers<ContextType>;
  HTML?: GraphQLScalarType;
  ISO8601DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductConnection?: ProductConnectionResolvers<ContextType>;
  ProductEdge?: ProductEdgeResolvers<ContextType>;
  ProductRecommendation?: ProductRecommendationResolvers<ContextType>;
  ProductRecommendationConnection?: ProductRecommendationConnectionResolvers<ContextType>;
  ProductRecommendationEdge?: ProductRecommendationEdgeResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RichText?: RichTextResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnsignedInt64?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
  Weight?: WeightResolvers<ContextType>;
}>;

