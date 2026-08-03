import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from './context.js';
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
  BigInt: { input: number; output: number; }
  /** A CSS color represented as a hexadecimal string. */
  Color: { input: any; output: any; }
  /** An opaque cursor used for pagination. */
  Cursor: { input: string; output: string; }
  /** An ISO 8601-encoded date and time string. */
  DateTime: { input: string; output: string; }
  /** An arbitrary-precision signed decimal number. */
  Decimal: { input: string; output: string; }
  /** An email address. */
  Email: { input: string; output: string; }
  /** A string containing HTML code. */
  HTML: { input: any; output: any; }
  /** An ISO 8601-encoded date and time string. */
  ISO8601DateTime: { input: any; output: any; }
  /** A JSON-serializable value. */
  JSON: { input: unknown; output: unknown; }
  /** An RFC 3986 and RFC 3987 compliant URI string. */
  URL: { input: string; output: string; }
  /** An unsigned 64-bit integer serialized as a decimal string. */
  UnsignedInt64: { input: any; output: any; }
};

export type ApiCheckout = {
  __typename?: 'Checkout';
  id: Scalars['ID']['output'];
};

/** Shared fields exposed by every Relay-style connection. */
export type ApiConnection = {
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Supported country codes. */
export enum ApiCountryCode {
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
export enum ApiCurrencyCode {
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

export type ApiCustomer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
  /** Orders owned by this authenticated customer, newest first by default. */
  orders: ApiOrderConnection;
};


export type ApiCustomerOrdersArgs = {
  after: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  statuses: InputMaybe<Array<ApiOrderStatus>>;
};

/** Dimension (length) measurement units */
export enum ApiDimensionUnit {
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
export type ApiDimensions = {
  __typename?: 'Dimensions';
  height: Scalars['Float']['output'];
  length: Scalars['Float']['output'];
  unit: ApiDimensionUnit;
  width: Scalars['Float']['output'];
};

/** Represents an error in the input of a mutation. */
export type ApiDisplayableError = {
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum ApiLocaleCode {
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
export type ApiMoney = {
  __typename?: 'Money';
  amount: Scalars['Decimal']['output'];
  currencyCode: ApiCurrencyCode;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  /** Cancels an eligible order owned by the authenticated customer. */
  orderCancel: ApiOrderCancelPayload;
  /**
   * Starts another payment attempt for an eligible failed, expired, or pending
   * order payment. Replaying the same idempotency key returns the same attempt.
   */
  orderPaymentRetry: ApiOrderPaymentRetryPayload;
  /** Creates a new checkout from currently purchasable lines of an order. */
  orderReorder: ApiOrderReorderPayload;
  /** Cancels a return request while its current state permits cancellation. */
  orderReturnRequestCancel: ApiOrderReturnRequestCancelPayload;
  /** Creates a return request for eligible quantities of purchased lines. */
  orderReturnRequestCreate: ApiOrderReturnRequestCreatePayload;
};


export type ApiMutationOrderCancelArgs = {
  input: ApiOrderCancelInput;
};


export type ApiMutationOrderPaymentRetryArgs = {
  input: ApiOrderPaymentRetryInput;
};


export type ApiMutationOrderReorderArgs = {
  input: ApiOrderReorderInput;
};


export type ApiMutationOrderReturnRequestCancelArgs = {
  input: ApiOrderReturnRequestCancelInput;
};


export type ApiMutationOrderReturnRequestCreateArgs = {
  input: ApiOrderReturnRequestCreateInput;
};

/** Enables global object identification following the Relay specification. */
export type ApiNode = {
  id: Scalars['ID']['output'];
};

/** A customer-visible order in the active storefront context. */
export type ApiOrder = ApiNode & {
  __typename?: 'Order';
  appliedPromoCodes: Array<ApiOrderPromoCode>;
  channelCode: Maybe<Scalars['String']['output']>;
  closedAt: Maybe<Scalars['DateTime']['output']>;
  cost: ApiOrderCost;
  createdAt: Scalars['DateTime']['output'];
  currencyCode: ApiCurrencyCode;
  customerIdentity: ApiOrderCustomerIdentity;
  customerNote: Maybe<Scalars['String']['output']>;
  deliveryGroups: Array<ApiOrderDeliveryGroup>;
  deliveryStatus: ApiOrderDeliveryStatus;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  fulfillmentStatus: ApiOrderFulfillmentStatus;
  fulfillments: Array<ApiOrderFulfillment>;
  id: Scalars['ID']['output'];
  lines: Array<ApiOrderLine>;
  localeCode: Maybe<ApiLocaleCode>;
  /** Human-readable order number unique within the store. */
  number: Scalars['BigInt']['output'];
  payment: ApiOrderPayment;
  /** @deprecated Use payment.method. */
  paymentMethod: Maybe<ApiOrderPaymentMethod>;
  placedAt: Maybe<Scalars['DateTime']['output']>;
  /** Return requests created for this order, newest first. */
  returnRequests: ApiOrderReturnRequestConnection;
  /** Server-evaluated post-order actions available to the current customer. */
  selfService: ApiOrderSelfService;
  status: ApiOrderStatus;
  totalQuantity: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


/** A customer-visible order in the active storefront context. */
export type ApiOrderReturnRequestsArgs = {
  after: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiOrderCancelInput = {
  expectedOrderUpdatedAt: Scalars['DateTime']['input'];
  idempotencyKey: Scalars['String']['input'];
  note: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
  reason: ApiOrderCancellationReason;
};

export type ApiOrderCancelPayload = {
  __typename?: 'OrderCancelPayload';
  order: Maybe<ApiOrder>;
  userErrors: Array<ApiOrderUserError>;
};

/** Customer-selected reason for cancelling an order. */
export enum ApiOrderCancellationReason {
  ChangedMind = 'CHANGED_MIND',
  DuplicateOrder = 'DUPLICATE_ORDER',
  IncorrectAddress = 'INCORRECT_ADDRESS',
  IncorrectItems = 'INCORRECT_ITEMS',
  Other = 'OTHER',
  PaymentIssue = 'PAYMENT_ISSUE'
}

export type ApiOrderConnection = ApiConnection & {
  __typename?: 'OrderConnection';
  edges: Array<ApiOrderEdge>;
  nodes: Array<ApiOrder>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

/** All monetary calculations captured when the order was placed. */
export type ApiOrderCost = {
  __typename?: 'OrderCost';
  subtotalAmount: ApiMoney;
  totalAmount: ApiMoney;
  totalDiscountAmount: ApiMoney;
  totalShippingAmount: ApiMoney;
  totalTaxAmount: ApiMoney;
};

/** Customer identity snapshot captured by the order. */
export type ApiOrderCustomerIdentity = {
  __typename?: 'OrderCustomerIdentity';
  countryCode: Maybe<ApiCountryCode>;
  customer: Maybe<ApiCustomer>;
  email: Maybe<Scalars['Email']['output']>;
  firstName: Maybe<Scalars['String']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  middleName: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
};

/** Immutable delivery destination captured for an order. */
export type ApiOrderDeliveryAddress = ApiNode & {
  __typename?: 'OrderDeliveryAddress';
  address1: Maybe<Scalars['String']['output']>;
  address2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  countryCode: Maybe<ApiCountryCode>;
  id: Scalars['ID']['output'];
  postalCode: Maybe<Scalars['String']['output']>;
  provinceCode: Maybe<Scalars['String']['output']>;
};

/** A delivery group and its immutable order snapshot. */
export type ApiOrderDeliveryGroup = ApiNode & {
  __typename?: 'OrderDeliveryGroup';
  address: Maybe<ApiOrderDeliveryAddress>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lines: Array<ApiOrderLine>;
  method: Maybe<ApiOrderDeliveryMethod>;
  recipient: Maybe<ApiOrderRecipient>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Delivery method selected for an order delivery group. */
export type ApiOrderDeliveryMethod = {
  __typename?: 'OrderDeliveryMethod';
  code: Scalars['String']['output'];
  paymentModel: Maybe<Scalars['String']['output']>;
  providerCode: Scalars['String']['output'];
  type: ApiOrderDeliveryMethodType;
};

/** The delivery method selected for an order delivery group. */
export enum ApiOrderDeliveryMethodType {
  Local = 'LOCAL',
  None = 'NONE',
  PickupPoint = 'PICKUP_POINT',
  PickUp = 'PICK_UP',
  Retail = 'RETAIL',
  Shipping = 'SHIPPING'
}

/** Aggregate customer-facing delivery state across all shipments. */
export enum ApiOrderDeliveryStatus {
  Cancelled = 'CANCELLED',
  Delayed = 'DELAYED',
  Delivered = 'DELIVERED',
  DeliveryAttempted = 'DELIVERY_ATTEMPTED',
  Exception = 'EXCEPTION',
  InTransit = 'IN_TRANSIT',
  NotShipped = 'NOT_SHIPPED',
  OutForDelivery = 'OUT_FOR_DELIVERY',
  PartiallyShipped = 'PARTIALLY_SHIPPED',
  ReturnedToSender = 'RETURNED_TO_SENDER',
  Shipped = 'SHIPPED'
}

export type ApiOrderEdge = {
  __typename?: 'OrderEdge';
  cursor: Scalars['Cursor']['output'];
  node: ApiOrder;
};

/** Merchant fulfillment of one or more purchased line quantities. */
export type ApiOrderFulfillment = ApiNode & {
  __typename?: 'OrderFulfillment';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lines: Array<ApiOrderFulfillmentLine>;
  shipments: Array<ApiOrderShipment>;
  status: ApiOrderFulfillmentOperationStatus;
  updatedAt: Scalars['DateTime']['output'];
};

/** Quantity from an order line assigned to a fulfillment. */
export type ApiOrderFulfillmentLine = {
  __typename?: 'OrderFulfillmentLine';
  orderLine: ApiOrderLine;
  quantity: Scalars['Int']['output'];
};

/** Lifecycle state of one fulfillment operation. */
export enum ApiOrderFulfillmentOperationStatus {
  Cancelled = 'CANCELLED',
  Failure = 'FAILURE',
  Open = 'OPEN',
  Pending = 'PENDING',
  Success = 'SUCCESS'
}

/** Aggregate fulfillment state across every line in an order. */
export enum ApiOrderFulfillmentStatus {
  Cancelled = 'CANCELLED',
  Fulfilled = 'FULFILLED',
  OnHold = 'ON_HOLD',
  PartiallyFulfilled = 'PARTIALLY_FULFILLED',
  Scheduled = 'SCHEDULED',
  Unfulfilled = 'UNFULFILLED'
}

/** Immutable customer-visible snapshot of one purchased line. */
export type ApiOrderLine = ApiNode & {
  __typename?: 'OrderLine';
  cost: ApiOrderLineCost;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  imageUrl: Maybe<Scalars['URL']['output']>;
  purchasableId: Scalars['ID']['output'];
  purchasableSnapshot: Scalars['JSON']['output'];
  quantity: Scalars['Int']['output'];
  /** Current return eligibility after previous returns and policy limits. */
  returnEligibility: ApiOrderLineReturnEligibility;
  sku: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderLineCost = {
  __typename?: 'OrderLineCost';
  discountAmount: ApiMoney;
  subtotalAmount: ApiMoney;
  taxAmount: ApiMoney;
  totalAmount: ApiMoney;
  unitCompareAtPrice: ApiMoney;
  unitPrice: ApiMoney;
};

/** Return eligibility for one purchased order line. */
export type ApiOrderLineReturnEligibility = {
  __typename?: 'OrderLineReturnEligibility';
  eligible: Scalars['Boolean']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  maxQuantity: Scalars['Int']['output'];
  unavailableReason: Maybe<Scalars['String']['output']>;
  unavailableReasonCode: Maybe<Scalars['String']['output']>;
};

/** Current payment aggregate and immutable payment history for an order. */
export type ApiOrderPayment = {
  __typename?: 'OrderPayment';
  authorizedAmount: ApiMoney;
  capturedAmount: ApiMoney;
  method: Maybe<ApiOrderPaymentMethod>;
  outstandingAmount: ApiMoney;
  refundedAmount: ApiMoney;
  refunds: Array<ApiOrderRefund>;
  retry: ApiOrderPaymentRetry;
  status: ApiOrderPaymentStatus;
  transactions: Array<ApiOrderPaymentTransaction>;
  voids: Array<ApiOrderVoid>;
};

/** Customer interaction required to continue the new payment attempt. */
export type ApiOrderPaymentCustomerAction = {
  __typename?: 'OrderPaymentCustomerAction';
  data: Maybe<Scalars['JSON']['output']>;
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  instructions: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
  type: ApiOrderPaymentCustomerActionType;
  url: Maybe<Scalars['URL']['output']>;
};

/** Customer interaction required to continue a retried payment. */
export enum ApiOrderPaymentCustomerActionType {
  Instructions = 'INSTRUCTIONS',
  Redirect = 'REDIRECT'
}

/** The customer interaction model of the selected payment method. */
export enum ApiOrderPaymentFlow {
  Offline = 'OFFLINE',
  Online = 'ONLINE',
  OnDelivery = 'ON_DELIVERY'
}

/** Payment method selected when the order was placed. */
export type ApiOrderPaymentMethod = {
  __typename?: 'OrderPaymentMethod';
  code: Scalars['String']['output'];
  flow: ApiOrderPaymentFlow;
  providerCode: Scalars['String']['output'];
};

/** Availability of another customer-initiated payment attempt. */
export type ApiOrderPaymentRetry = {
  __typename?: 'OrderPaymentRetry';
  available: Scalars['Boolean']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  unavailableReason: Maybe<Scalars['String']['output']>;
  unavailableReasonCode: Maybe<Scalars['String']['output']>;
};

export type ApiOrderPaymentRetryInput = {
  expectedOrderUpdatedAt: Scalars['DateTime']['input'];
  idempotencyKey: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
  /** HTTPS URL to which an online payment provider may return the customer. */
  returnUrl: InputMaybe<Scalars['URL']['input']>;
};

export type ApiOrderPaymentRetryPayload = {
  __typename?: 'OrderPaymentRetryPayload';
  attemptId: Maybe<Scalars['ID']['output']>;
  customerAction: Maybe<ApiOrderPaymentCustomerAction>;
  order: Maybe<ApiOrder>;
  status: Maybe<ApiOrderPaymentRetryStatus>;
  userErrors: Array<ApiOrderUserError>;
};

/** State returned after requesting another payment attempt. */
export enum ApiOrderPaymentRetryStatus {
  Authorized = 'AUTHORIZED',
  Failed = 'FAILED',
  Paid = 'PAID',
  Pending = 'PENDING',
  RequiresAction = 'REQUIRES_ACTION'
}

/** Aggregate payment state for an order. */
export enum ApiOrderPaymentStatus {
  Authorized = 'AUTHORIZED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Paid = 'PAID',
  PartiallyPaid = 'PARTIALLY_PAID',
  PartiallyRefunded = 'PARTIALLY_REFUNDED',
  Pending = 'PENDING',
  Refunded = 'REFUNDED',
  Voided = 'VOIDED'
}

/** One immutable payment operation recorded against an order. */
export type ApiOrderPaymentTransaction = ApiNode & {
  __typename?: 'OrderPaymentTransaction';
  amount: ApiMoney;
  createdAt: Scalars['DateTime']['output'];
  failureCode: Maybe<Scalars['String']['output']>;
  failureMessage: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: ApiOrderPaymentTransactionKind;
  processedAt: Maybe<Scalars['DateTime']['output']>;
  providerCode: Scalars['String']['output'];
  reference: Maybe<Scalars['String']['output']>;
  status: ApiOrderPaymentTransactionStatus;
};

/** The accounting operation represented by a payment transaction. */
export enum ApiOrderPaymentTransactionKind {
  Authorization = 'AUTHORIZATION',
  Capture = 'CAPTURE',
  Refund = 'REFUND',
  Sale = 'SALE',
  Void = 'VOID'
}

/** Lifecycle state of a payment transaction. */
export enum ApiOrderPaymentTransactionStatus {
  Cancelled = 'CANCELLED',
  Failure = 'FAILURE',
  Pending = 'PENDING',
  Success = 'SUCCESS'
}

/** A promotional code captured when the order was placed. */
export type ApiOrderPromoCode = {
  __typename?: 'OrderPromoCode';
  appliedAt: Scalars['DateTime']['output'];
  code: Scalars['String']['output'];
  conditions: Maybe<Scalars['JSON']['output']>;
  discountType: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  value: Scalars['Decimal']['output'];
};

/** Immutable recipient details captured for an order delivery group. */
export type ApiOrderRecipient = {
  __typename?: 'OrderRecipient';
  email: Maybe<Scalars['Email']['output']>;
  firstName: Maybe<Scalars['String']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  middleName: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
};

/** Customer-visible refund recorded against the order. */
export type ApiOrderRefund = ApiNode & {
  __typename?: 'OrderRefund';
  amount: ApiMoney;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lines: Array<ApiOrderRefundLine>;
  note: Maybe<Scalars['String']['output']>;
  processedAt: Maybe<Scalars['DateTime']['output']>;
  reason: Maybe<Scalars['String']['output']>;
  status: ApiOrderRefundStatus;
};

/** Quantity and amount returned for one purchased order line. */
export type ApiOrderRefundLine = {
  __typename?: 'OrderRefundLine';
  amount: ApiMoney;
  orderLine: ApiOrderLine;
  quantity: Scalars['Int']['output'];
};

/** Lifecycle state of a customer-visible refund. */
export enum ApiOrderRefundStatus {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Succeeded = 'SUCCEEDED'
}

export type ApiOrderReorderInput = {
  idempotencyKey: Scalars['String']['input'];
  /** Lines to copy. When omitted, every currently purchasable order line is used. */
  lines: InputMaybe<Array<ApiOrderReorderLineInput>>;
  orderId: Scalars['ID']['input'];
};

/** Optional quantity override for one line copied into a reorder checkout. */
export type ApiOrderReorderLineInput = {
  orderLineId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
};

export type ApiOrderReorderPayload = {
  __typename?: 'OrderReorderPayload';
  checkout: Maybe<ApiCheckout>;
  skippedLines: Array<ApiOrderReorderSkippedLine>;
  userErrors: Array<ApiOrderUserError>;
};

/** An order line that could not be copied into the new checkout. */
export type ApiOrderReorderSkippedLine = {
  __typename?: 'OrderReorderSkippedLine';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
  orderLine: ApiOrderLine;
};

/** Customer-selected reason for returning an order line. */
export enum ApiOrderReturnReason {
  ChangedMind = 'CHANGED_MIND',
  Damaged = 'DAMAGED',
  Defective = 'DEFECTIVE',
  IncorrectItem = 'INCORRECT_ITEM',
  NotAsDescribed = 'NOT_AS_DESCRIBED',
  Other = 'OTHER',
  SizeOrFit = 'SIZE_OR_FIT'
}

/** A customer-created request to return one or more order lines. */
export type ApiOrderReturnRequest = ApiNode & {
  __typename?: 'OrderReturnRequest';
  canCancel: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  customerNote: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lines: Array<ApiOrderReturnRequestLine>;
  order: ApiOrder;
  requestedAt: Scalars['DateTime']['output'];
  resolvedAt: Maybe<Scalars['DateTime']['output']>;
  revision: Scalars['Int']['output'];
  status: ApiOrderReturnRequestStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderReturnRequestCancelInput = {
  expectedRevision: Scalars['Int']['input'];
  idempotencyKey: Scalars['String']['input'];
  returnRequestId: Scalars['ID']['input'];
};

export type ApiOrderReturnRequestCancelPayload = {
  __typename?: 'OrderReturnRequestCancelPayload';
  returnRequest: Maybe<ApiOrderReturnRequest>;
  userErrors: Array<ApiOrderUserError>;
};

export type ApiOrderReturnRequestConnection = ApiConnection & {
  __typename?: 'OrderReturnRequestConnection';
  edges: Array<ApiOrderReturnRequestEdge>;
  nodes: Array<ApiOrderReturnRequest>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiOrderReturnRequestCreateInput = {
  customerNote: InputMaybe<Scalars['String']['input']>;
  expectedOrderUpdatedAt: Scalars['DateTime']['input'];
  idempotencyKey: Scalars['String']['input'];
  lines: Array<ApiOrderReturnRequestLineInput>;
  orderId: Scalars['ID']['input'];
};

export type ApiOrderReturnRequestCreatePayload = {
  __typename?: 'OrderReturnRequestCreatePayload';
  order: Maybe<ApiOrder>;
  returnRequest: Maybe<ApiOrderReturnRequest>;
  userErrors: Array<ApiOrderUserError>;
};

export type ApiOrderReturnRequestEdge = {
  __typename?: 'OrderReturnRequestEdge';
  cursor: Scalars['Cursor']['output'];
  node: ApiOrderReturnRequest;
};

/** One line requested for return. */
export type ApiOrderReturnRequestLine = {
  __typename?: 'OrderReturnRequestLine';
  note: Maybe<Scalars['String']['output']>;
  orderLine: ApiOrderLine;
  quantity: Scalars['Int']['output'];
  reason: ApiOrderReturnReason;
};

export type ApiOrderReturnRequestLineInput = {
  note: InputMaybe<Scalars['String']['input']>;
  orderLineId: Scalars['ID']['input'];
  quantity: Scalars['Int']['input'];
  reason: ApiOrderReturnReason;
};

/** Customer-visible lifecycle of a return request. */
export enum ApiOrderReturnRequestStatus {
  Approved = 'APPROVED',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  InTransit = 'IN_TRANSIT',
  Received = 'RECEIVED',
  Rejected = 'REJECTED',
  Requested = 'REQUESTED'
}

/** Post-order capabilities evaluated for the authenticated customer. */
export type ApiOrderSelfService = {
  __typename?: 'OrderSelfService';
  cancel: ApiOrderSelfServiceAction;
  reorder: ApiOrderSelfServiceAction;
  requestReturn: ApiOrderSelfServiceAction;
  retryPayment: ApiOrderSelfServiceAction;
};

/** Availability of one post-order action in the current order state. */
export type ApiOrderSelfServiceAction = {
  __typename?: 'OrderSelfServiceAction';
  available: Scalars['Boolean']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  unavailableReason: Maybe<Scalars['String']['output']>;
  /** Stable machine-readable explanation when the action is unavailable. */
  unavailableReasonCode: Maybe<Scalars['String']['output']>;
};

/** One physical shipment created for an order fulfillment. */
export type ApiOrderShipment = ApiNode & {
  __typename?: 'OrderShipment';
  carrierCode: Maybe<Scalars['String']['output']>;
  carrierName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deliveredAt: Maybe<Scalars['DateTime']['output']>;
  estimatedDeliveryAt: Maybe<Scalars['DateTime']['output']>;
  events: Array<ApiOrderTrackingEvent>;
  id: Scalars['ID']['output'];
  serviceCode: Maybe<Scalars['String']['output']>;
  shippedAt: Maybe<Scalars['DateTime']['output']>;
  status: ApiOrderShipmentStatus;
  tracking: Array<ApiOrderTrackingInfo>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Customer-facing lifecycle state of one physical shipment. */
export enum ApiOrderShipmentStatus {
  Cancelled = 'CANCELLED',
  Delayed = 'DELAYED',
  Delivered = 'DELIVERED',
  DeliveryAttempted = 'DELIVERY_ATTEMPTED',
  Exception = 'EXCEPTION',
  InTransit = 'IN_TRANSIT',
  LabelCreated = 'LABEL_CREATED',
  OutForDelivery = 'OUT_FOR_DELIVERY',
  PickedUp = 'PICKED_UP',
  ReadyForPickup = 'READY_FOR_PICKUP',
  ReturnedToSender = 'RETURNED_TO_SENDER'
}

/** The lifecycle state of an order visible to its customer. */
export enum ApiOrderStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Closed = 'CLOSED',
  Draft = 'DRAFT'
}

/** Carrier scan or merchant-provided progress event for a shipment. */
export type ApiOrderTrackingEvent = ApiNode & {
  __typename?: 'OrderTrackingEvent';
  happenedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  location: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  status: ApiOrderShipmentStatus;
};

/** Carrier tracking identity. A shipment may expose multiple tracking numbers. */
export type ApiOrderTrackingInfo = {
  __typename?: 'OrderTrackingInfo';
  company: Maybe<Scalars['String']['output']>;
  number: Scalars['String']['output'];
  url: Maybe<Scalars['URL']['output']>;
};

/** Customer-facing post-order mutation error. */
export type ApiOrderUserError = ApiDisplayableError & {
  __typename?: 'OrderUserError';
  code: Scalars['String']['output'];
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
  retryable: Scalars['Boolean']['output'];
};

/** Customer-visible void of a previously authorized payment amount. */
export type ApiOrderVoid = ApiNode & {
  __typename?: 'OrderVoid';
  amount: ApiMoney;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  processedAt: Maybe<Scalars['DateTime']['output']>;
  reason: Maybe<Scalars['String']['output']>;
  status: ApiOrderVoidStatus;
};

/** Lifecycle state of a payment authorization void. */
export enum ApiOrderVoidStatus {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Succeeded = 'SUCCEEDED'
}

/** Returns information about pagination in a connection. */
export type ApiPageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['Cursor']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['Cursor']['output']>;
};

/** Direction in which a price adjustment changes the base price. */
export enum ApiPriceAdjustmentOperation {
  /** Subtract the calculated value from the base price. */
  Decrease = 'DECREASE',
  /** Add the calculated value to the base price. */
  Increase = 'INCREASE'
}

/** Representation used to calculate a price adjustment. */
export enum ApiPriceAdjustmentValueType {
  /** Use a monetary value expressed in minor currency units. */
  FixedAmount = 'FIXED_AMOUNT',
  /** Calculate the value from basis points where 10000 equals 100%. */
  Percentage = 'PERCENTAGE'
}

export type ApiQuery = {
  __typename?: 'Query';
  /**
   * Returns an order owned by the authenticated customer.
   *
   * Customer ownership and store scope are resolved from trusted storefront
   * context. An inaccessible order is returned as null.
   */
  order: Maybe<ApiOrder>;
  /** Returns a return request owned by the authenticated customer. */
  orderReturnRequest: Maybe<ApiOrderReturnRequest>;
};


export type ApiQueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type ApiQueryOrderReturnRequestArgs = {
  id: Scalars['ID']['input'];
};

/** Localized rich text in plain text, HTML, and structured JSON formats. */
export type ApiRichText = {
  __typename?: 'RichText';
  html: Scalars['HTML']['output'];
  json: Scalars['JSON']['output'];
  text: Scalars['String']['output'];
};

/** Represents a generic error in the input of a mutation. */
export type ApiUserError = ApiDisplayableError & {
  __typename?: 'UserError';
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** A weight measurement expressed in a supported unit. */
export type ApiWeight = {
  __typename?: 'Weight';
  unit: ApiWeightUnit;
  value: Scalars['Float']['output'];
};

/** Weight measurement units */
export enum ApiWeightUnit {
  /** Gram */
  G = 'g',
  /** Kilogram */
  Kg = 'kg',
  /** Pound */
  Lb = 'lb',
  /** Ounce */
  Oz = 'oz'
}



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


/** Mapping of interface types */
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Connection: ( ApiOrderConnection ) | ( ApiOrderReturnRequestConnection );
  DisplayableError: ( ApiOrderUserError ) | ( ApiUserError );
  Node: ( ApiOrder ) | ( ApiOrderDeliveryAddress ) | ( ApiOrderDeliveryGroup ) | ( ApiOrderFulfillment ) | ( ApiOrderLine ) | ( ApiOrderPaymentTransaction ) | ( ApiOrderRefund ) | ( ApiOrderReturnRequest ) | ( ApiOrderShipment ) | ( ApiOrderTrackingEvent ) | ( ApiOrderVoid );
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Checkout: ResolverTypeWrapper<ApiCheckout>;
  Color: ResolverTypeWrapper<Scalars['Color']['output']>;
  Connection: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Connection']>;
  CountryCode: ApiCountryCode;
  CurrencyCode: ApiCurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  Customer: ResolverTypeWrapper<ApiCustomer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DimensionUnit: ApiDimensionUnit;
  Dimensions: ResolverTypeWrapper<ApiDimensions>;
  DisplayableError: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['DisplayableError']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  HTML: ResolverTypeWrapper<Scalars['HTML']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ISO8601DateTime: ResolverTypeWrapper<Scalars['ISO8601DateTime']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: ApiLocaleCode;
  Money: ResolverTypeWrapper<ApiMoney>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Node']>;
  Order: ResolverTypeWrapper<ApiOrder>;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCancelPayload: ResolverTypeWrapper<ApiOrderCancelPayload>;
  OrderCancellationReason: ApiOrderCancellationReason;
  OrderConnection: ResolverTypeWrapper<ApiOrderConnection>;
  OrderCost: ResolverTypeWrapper<ApiOrderCost>;
  OrderCustomerIdentity: ResolverTypeWrapper<ApiOrderCustomerIdentity>;
  OrderDeliveryAddress: ResolverTypeWrapper<ApiOrderDeliveryAddress>;
  OrderDeliveryGroup: ResolverTypeWrapper<ApiOrderDeliveryGroup>;
  OrderDeliveryMethod: ResolverTypeWrapper<ApiOrderDeliveryMethod>;
  OrderDeliveryMethodType: ApiOrderDeliveryMethodType;
  OrderDeliveryStatus: ApiOrderDeliveryStatus;
  OrderEdge: ResolverTypeWrapper<ApiOrderEdge>;
  OrderFulfillment: ResolverTypeWrapper<ApiOrderFulfillment>;
  OrderFulfillmentLine: ResolverTypeWrapper<ApiOrderFulfillmentLine>;
  OrderFulfillmentOperationStatus: ApiOrderFulfillmentOperationStatus;
  OrderFulfillmentStatus: ApiOrderFulfillmentStatus;
  OrderLine: ResolverTypeWrapper<ApiOrderLine>;
  OrderLineCost: ResolverTypeWrapper<ApiOrderLineCost>;
  OrderLineReturnEligibility: ResolverTypeWrapper<ApiOrderLineReturnEligibility>;
  OrderPayment: ResolverTypeWrapper<ApiOrderPayment>;
  OrderPaymentCustomerAction: ResolverTypeWrapper<ApiOrderPaymentCustomerAction>;
  OrderPaymentCustomerActionType: ApiOrderPaymentCustomerActionType;
  OrderPaymentFlow: ApiOrderPaymentFlow;
  OrderPaymentMethod: ResolverTypeWrapper<ApiOrderPaymentMethod>;
  OrderPaymentRetry: ResolverTypeWrapper<ApiOrderPaymentRetry>;
  OrderPaymentRetryInput: ApiOrderPaymentRetryInput;
  OrderPaymentRetryPayload: ResolverTypeWrapper<ApiOrderPaymentRetryPayload>;
  OrderPaymentRetryStatus: ApiOrderPaymentRetryStatus;
  OrderPaymentStatus: ApiOrderPaymentStatus;
  OrderPaymentTransaction: ResolverTypeWrapper<ApiOrderPaymentTransaction>;
  OrderPaymentTransactionKind: ApiOrderPaymentTransactionKind;
  OrderPaymentTransactionStatus: ApiOrderPaymentTransactionStatus;
  OrderPromoCode: ResolverTypeWrapper<ApiOrderPromoCode>;
  OrderRecipient: ResolverTypeWrapper<ApiOrderRecipient>;
  OrderRefund: ResolverTypeWrapper<ApiOrderRefund>;
  OrderRefundLine: ResolverTypeWrapper<ApiOrderRefundLine>;
  OrderRefundStatus: ApiOrderRefundStatus;
  OrderReorderInput: ApiOrderReorderInput;
  OrderReorderLineInput: ApiOrderReorderLineInput;
  OrderReorderPayload: ResolverTypeWrapper<ApiOrderReorderPayload>;
  OrderReorderSkippedLine: ResolverTypeWrapper<ApiOrderReorderSkippedLine>;
  OrderReturnReason: ApiOrderReturnReason;
  OrderReturnRequest: ResolverTypeWrapper<ApiOrderReturnRequest>;
  OrderReturnRequestCancelInput: ApiOrderReturnRequestCancelInput;
  OrderReturnRequestCancelPayload: ResolverTypeWrapper<ApiOrderReturnRequestCancelPayload>;
  OrderReturnRequestConnection: ResolverTypeWrapper<ApiOrderReturnRequestConnection>;
  OrderReturnRequestCreateInput: ApiOrderReturnRequestCreateInput;
  OrderReturnRequestCreatePayload: ResolverTypeWrapper<ApiOrderReturnRequestCreatePayload>;
  OrderReturnRequestEdge: ResolverTypeWrapper<ApiOrderReturnRequestEdge>;
  OrderReturnRequestLine: ResolverTypeWrapper<ApiOrderReturnRequestLine>;
  OrderReturnRequestLineInput: ApiOrderReturnRequestLineInput;
  OrderReturnRequestStatus: ApiOrderReturnRequestStatus;
  OrderSelfService: ResolverTypeWrapper<ApiOrderSelfService>;
  OrderSelfServiceAction: ResolverTypeWrapper<ApiOrderSelfServiceAction>;
  OrderShipment: ResolverTypeWrapper<ApiOrderShipment>;
  OrderShipmentStatus: ApiOrderShipmentStatus;
  OrderStatus: ApiOrderStatus;
  OrderTrackingEvent: ResolverTypeWrapper<ApiOrderTrackingEvent>;
  OrderTrackingInfo: ResolverTypeWrapper<ApiOrderTrackingInfo>;
  OrderUserError: ResolverTypeWrapper<ApiOrderUserError>;
  OrderVoid: ResolverTypeWrapper<ApiOrderVoid>;
  OrderVoidStatus: ApiOrderVoidStatus;
  PageInfo: ResolverTypeWrapper<ApiPageInfo>;
  PriceAdjustmentOperation: ApiPriceAdjustmentOperation;
  PriceAdjustmentValueType: ApiPriceAdjustmentValueType;
  Query: ResolverTypeWrapper<{}>;
  RichText: ResolverTypeWrapper<ApiRichText>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UnsignedInt64: ResolverTypeWrapper<Scalars['UnsignedInt64']['output']>;
  UserError: ResolverTypeWrapper<ApiUserError>;
  Weight: ResolverTypeWrapper<ApiWeight>;
  WeightUnit: ApiWeightUnit;
};

/** Mapping between all available schema types and the resolvers parents */
export type ApiResolversParentTypes = {
  BigInt: Scalars['BigInt']['output'];
  Boolean: Scalars['Boolean']['output'];
  Checkout: ApiCheckout;
  Color: Scalars['Color']['output'];
  Connection: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Connection'];
  Cursor: Scalars['Cursor']['output'];
  Customer: ApiCustomer;
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  Dimensions: ApiDimensions;
  DisplayableError: ApiResolversInterfaceTypes<ApiResolversParentTypes>['DisplayableError'];
  Email: Scalars['Email']['output'];
  Float: Scalars['Float']['output'];
  HTML: Scalars['HTML']['output'];
  ID: Scalars['ID']['output'];
  ISO8601DateTime: Scalars['ISO8601DateTime']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Money: ApiMoney;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Node'];
  Order: ApiOrder;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCancelPayload: ApiOrderCancelPayload;
  OrderConnection: ApiOrderConnection;
  OrderCost: ApiOrderCost;
  OrderCustomerIdentity: ApiOrderCustomerIdentity;
  OrderDeliveryAddress: ApiOrderDeliveryAddress;
  OrderDeliveryGroup: ApiOrderDeliveryGroup;
  OrderDeliveryMethod: ApiOrderDeliveryMethod;
  OrderEdge: ApiOrderEdge;
  OrderFulfillment: ApiOrderFulfillment;
  OrderFulfillmentLine: ApiOrderFulfillmentLine;
  OrderLine: ApiOrderLine;
  OrderLineCost: ApiOrderLineCost;
  OrderLineReturnEligibility: ApiOrderLineReturnEligibility;
  OrderPayment: ApiOrderPayment;
  OrderPaymentCustomerAction: ApiOrderPaymentCustomerAction;
  OrderPaymentMethod: ApiOrderPaymentMethod;
  OrderPaymentRetry: ApiOrderPaymentRetry;
  OrderPaymentRetryInput: ApiOrderPaymentRetryInput;
  OrderPaymentRetryPayload: ApiOrderPaymentRetryPayload;
  OrderPaymentTransaction: ApiOrderPaymentTransaction;
  OrderPromoCode: ApiOrderPromoCode;
  OrderRecipient: ApiOrderRecipient;
  OrderRefund: ApiOrderRefund;
  OrderRefundLine: ApiOrderRefundLine;
  OrderReorderInput: ApiOrderReorderInput;
  OrderReorderLineInput: ApiOrderReorderLineInput;
  OrderReorderPayload: ApiOrderReorderPayload;
  OrderReorderSkippedLine: ApiOrderReorderSkippedLine;
  OrderReturnRequest: ApiOrderReturnRequest;
  OrderReturnRequestCancelInput: ApiOrderReturnRequestCancelInput;
  OrderReturnRequestCancelPayload: ApiOrderReturnRequestCancelPayload;
  OrderReturnRequestConnection: ApiOrderReturnRequestConnection;
  OrderReturnRequestCreateInput: ApiOrderReturnRequestCreateInput;
  OrderReturnRequestCreatePayload: ApiOrderReturnRequestCreatePayload;
  OrderReturnRequestEdge: ApiOrderReturnRequestEdge;
  OrderReturnRequestLine: ApiOrderReturnRequestLine;
  OrderReturnRequestLineInput: ApiOrderReturnRequestLineInput;
  OrderSelfService: ApiOrderSelfService;
  OrderSelfServiceAction: ApiOrderSelfServiceAction;
  OrderShipment: ApiOrderShipment;
  OrderTrackingEvent: ApiOrderTrackingEvent;
  OrderTrackingInfo: ApiOrderTrackingInfo;
  OrderUserError: ApiOrderUserError;
  OrderVoid: ApiOrderVoid;
  PageInfo: ApiPageInfo;
  Query: {};
  RichText: ApiRichText;
  String: Scalars['String']['output'];
  URL: Scalars['URL']['output'];
  UnsignedInt64: Scalars['UnsignedInt64']['output'];
  UserError: ApiUserError;
  Weight: ApiWeight;
};

export interface ApiBigIntScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type ApiCheckoutResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Checkout'] = ApiResolversParentTypes['Checkout']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiColorScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Color'], any> {
  name: 'Color';
}

export type ApiConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Connection'] = ApiResolversParentTypes['Connection']> = {
  __resolveType: TypeResolveFn<'OrderConnection' | 'OrderReturnRequestConnection', ParentType, ContextType>;
  pageInfo: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
};

export interface ApiCursorScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export type ApiCustomerResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Customer'] = ApiResolversParentTypes['Customer']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  orders: Resolver<ApiResolversTypes['OrderConnection'], ParentType, ContextType, RequireFields<ApiCustomerOrdersArgs, 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiDateTimeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface ApiDecimalScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export type ApiDimensionsResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Dimensions'] = ApiResolversParentTypes['Dimensions']> = {
  height: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  length: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  unit: Resolver<ApiResolversTypes['DimensionUnit'], ParentType, ContextType>;
  width: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiDisplayableErrorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['DisplayableError'] = ApiResolversParentTypes['DisplayableError']> = {
  __resolveType: TypeResolveFn<'OrderUserError' | 'UserError', ParentType, ContextType>;
  field: Resolver<Maybe<Array<ApiResolversTypes['String']>>, ParentType, ContextType>;
  message: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
};

export interface ApiEmailScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Email'], any> {
  name: 'Email';
}

export interface ApiHtmlScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['HTML'], any> {
  name: 'HTML';
}

export interface ApiIso8601DateTimeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['ISO8601DateTime'], any> {
  name: 'ISO8601DateTime';
}

export interface ApiJsonScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type ApiMoneyResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Money'] = ApiResolversParentTypes['Money']> = {
  amount: Resolver<ApiResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode: Resolver<ApiResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Mutation'] = ApiResolversParentTypes['Mutation']> = {
  orderCancel: Resolver<ApiResolversTypes['OrderCancelPayload'], ParentType, ContextType, RequireFields<ApiMutationOrderCancelArgs, 'input'>>;
  orderPaymentRetry: Resolver<ApiResolversTypes['OrderPaymentRetryPayload'], ParentType, ContextType, RequireFields<ApiMutationOrderPaymentRetryArgs, 'input'>>;
  orderReorder: Resolver<ApiResolversTypes['OrderReorderPayload'], ParentType, ContextType, RequireFields<ApiMutationOrderReorderArgs, 'input'>>;
  orderReturnRequestCancel: Resolver<ApiResolversTypes['OrderReturnRequestCancelPayload'], ParentType, ContextType, RequireFields<ApiMutationOrderReturnRequestCancelArgs, 'input'>>;
  orderReturnRequestCreate: Resolver<ApiResolversTypes['OrderReturnRequestCreatePayload'], ParentType, ContextType, RequireFields<ApiMutationOrderReturnRequestCreateArgs, 'input'>>;
};

export type ApiNodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Node'] = ApiResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<'Order' | 'OrderDeliveryAddress' | 'OrderDeliveryGroup' | 'OrderFulfillment' | 'OrderLine' | 'OrderPaymentTransaction' | 'OrderRefund' | 'OrderReturnRequest' | 'OrderShipment' | 'OrderTrackingEvent' | 'OrderVoid', ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
};

export type ApiOrderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Order'] = ApiResolversParentTypes['Order']> = {
  appliedPromoCodes: Resolver<Array<ApiResolversTypes['OrderPromoCode']>, ParentType, ContextType>;
  channelCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  closedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes['OrderCost'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  currencyCode: Resolver<ApiResolversTypes['CurrencyCode'], ParentType, ContextType>;
  customerIdentity: Resolver<ApiResolversTypes['OrderCustomerIdentity'], ParentType, ContextType>;
  customerNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  deliveryGroups: Resolver<Array<ApiResolversTypes['OrderDeliveryGroup']>, ParentType, ContextType>;
  deliveryStatus: Resolver<ApiResolversTypes['OrderDeliveryStatus'], ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  fulfillmentStatus: Resolver<ApiResolversTypes['OrderFulfillmentStatus'], ParentType, ContextType>;
  fulfillments: Resolver<Array<ApiResolversTypes['OrderFulfillment']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  localeCode: Resolver<Maybe<ApiResolversTypes['LocaleCode']>, ParentType, ContextType>;
  number: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  payment: Resolver<ApiResolversTypes['OrderPayment'], ParentType, ContextType>;
  paymentMethod: Resolver<Maybe<ApiResolversTypes['OrderPaymentMethod']>, ParentType, ContextType>;
  placedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  returnRequests: Resolver<ApiResolversTypes['OrderReturnRequestConnection'], ParentType, ContextType, RequireFields<ApiOrderReturnRequestsArgs, 'first'>>;
  selfService: Resolver<ApiResolversTypes['OrderSelfService'], ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderStatus'], ParentType, ContextType>;
  totalQuantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCancelPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCancelPayload'] = ApiResolversParentTypes['OrderCancelPayload']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  userErrors: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderConnection'] = ApiResolversParentTypes['OrderConnection']> = {
  edges: Resolver<Array<ApiResolversTypes['OrderEdge']>, ParentType, ContextType>;
  nodes: Resolver<Array<ApiResolversTypes['Order']>, ParentType, ContextType>;
  pageInfo: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCost'] = ApiResolversParentTypes['OrderCost']> = {
  subtotalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalDiscountAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalShippingAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalTaxAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCustomerIdentityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCustomerIdentity'] = ApiResolversParentTypes['OrderCustomerIdentity']> = {
  countryCode: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  customer: Resolver<Maybe<ApiResolversTypes['Customer']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  middleName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryAddressResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryAddress'] = ApiResolversParentTypes['OrderDeliveryAddress']> = {
  address1: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  address2: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  city: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  countryCode: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  postalCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  provinceCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryGroupResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryGroup'] = ApiResolversParentTypes['OrderDeliveryGroup']> = {
  address: Resolver<Maybe<ApiResolversTypes['OrderDeliveryAddress']>, ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  method: Resolver<Maybe<ApiResolversTypes['OrderDeliveryMethod']>, ParentType, ContextType>;
  recipient: Resolver<Maybe<ApiResolversTypes['OrderRecipient']>, ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryMethodResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryMethod'] = ApiResolversParentTypes['OrderDeliveryMethod']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  paymentModel: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  providerCode: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  type: Resolver<ApiResolversTypes['OrderDeliveryMethodType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderEdgeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderEdge'] = ApiResolversParentTypes['OrderEdge']> = {
  cursor: Resolver<ApiResolversTypes['Cursor'], ParentType, ContextType>;
  node: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderFulfillmentResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderFulfillment'] = ApiResolversParentTypes['OrderFulfillment']> = {
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderFulfillmentLine']>, ParentType, ContextType>;
  shipments: Resolver<Array<ApiResolversTypes['OrderShipment']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderFulfillmentOperationStatus'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderFulfillmentLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderFulfillmentLine'] = ApiResolversParentTypes['OrderFulfillmentLine']> = {
  orderLine: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLine'] = ApiResolversParentTypes['OrderLine']> = {
  cost: Resolver<ApiResolversTypes['OrderLineCost'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  imageUrl: Resolver<Maybe<ApiResolversTypes['URL']>, ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasableSnapshot: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  returnEligibility: Resolver<ApiResolversTypes['OrderLineReturnEligibility'], ParentType, ContextType>;
  sku: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  title: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLineCost'] = ApiResolversParentTypes['OrderLineCost']> = {
  discountAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  subtotalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  taxAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  unitCompareAtPrice: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  unitPrice: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineReturnEligibilityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLineReturnEligibility'] = ApiResolversParentTypes['OrderLineReturnEligibility']> = {
  eligible: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  maxQuantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  unavailableReason: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  unavailableReasonCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPayment'] = ApiResolversParentTypes['OrderPayment']> = {
  authorizedAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  capturedAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  method: Resolver<Maybe<ApiResolversTypes['OrderPaymentMethod']>, ParentType, ContextType>;
  outstandingAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  refundedAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  refunds: Resolver<Array<ApiResolversTypes['OrderRefund']>, ParentType, ContextType>;
  retry: Resolver<ApiResolversTypes['OrderPaymentRetry'], ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderPaymentStatus'], ParentType, ContextType>;
  transactions: Resolver<Array<ApiResolversTypes['OrderPaymentTransaction']>, ParentType, ContextType>;
  voids: Resolver<Array<ApiResolversTypes['OrderVoid']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentCustomerActionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentCustomerAction'] = ApiResolversParentTypes['OrderPaymentCustomerAction']> = {
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  instructions: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  title: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  type: Resolver<ApiResolversTypes['OrderPaymentCustomerActionType'], ParentType, ContextType>;
  url: Resolver<Maybe<ApiResolversTypes['URL']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentMethodResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentMethod'] = ApiResolversParentTypes['OrderPaymentMethod']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  flow: Resolver<ApiResolversTypes['OrderPaymentFlow'], ParentType, ContextType>;
  providerCode: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentRetryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentRetry'] = ApiResolversParentTypes['OrderPaymentRetry']> = {
  available: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  unavailableReason: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  unavailableReasonCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentRetryPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentRetryPayload'] = ApiResolversParentTypes['OrderPaymentRetryPayload']> = {
  attemptId: Resolver<Maybe<ApiResolversTypes['ID']>, ParentType, ContextType>;
  customerAction: Resolver<Maybe<ApiResolversTypes['OrderPaymentCustomerAction']>, ParentType, ContextType>;
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  status: Resolver<Maybe<ApiResolversTypes['OrderPaymentRetryStatus']>, ParentType, ContextType>;
  userErrors: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPaymentTransactionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPaymentTransaction'] = ApiResolversParentTypes['OrderPaymentTransaction']> = {
  amount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  failureCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  failureMessage: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  kind: Resolver<ApiResolversTypes['OrderPaymentTransactionKind'], ParentType, ContextType>;
  processedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  providerCode: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  reference: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderPaymentTransactionStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPromoCodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPromoCode'] = ApiResolversParentTypes['OrderPromoCode']> = {
  appliedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  conditions: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  discountType: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  provider: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  value: Resolver<ApiResolversTypes['Decimal'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderRecipientResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderRecipient'] = ApiResolversParentTypes['OrderRecipient']> = {
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  middleName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderRefundResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderRefund'] = ApiResolversParentTypes['OrderRefund']> = {
  amount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderRefundLine']>, ParentType, ContextType>;
  note: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  processedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  reason: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderRefundStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderRefundLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderRefundLine'] = ApiResolversParentTypes['OrderRefundLine']> = {
  amount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  orderLine: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReorderPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReorderPayload'] = ApiResolversParentTypes['OrderReorderPayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  skippedLines: Resolver<Array<ApiResolversTypes['OrderReorderSkippedLine']>, ParentType, ContextType>;
  userErrors: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReorderSkippedLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReorderSkippedLine'] = ApiResolversParentTypes['OrderReorderSkippedLine']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  message: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  orderLine: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnRequestResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnRequest'] = ApiResolversParentTypes['OrderReturnRequest']> = {
  canCancel: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  customerNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderReturnRequestLine']>, ParentType, ContextType>;
  order: Resolver<ApiResolversTypes['Order'], ParentType, ContextType>;
  requestedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  resolvedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  revision: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderReturnRequestStatus'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnRequestCancelPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnRequestCancelPayload'] = ApiResolversParentTypes['OrderReturnRequestCancelPayload']> = {
  returnRequest: Resolver<Maybe<ApiResolversTypes['OrderReturnRequest']>, ParentType, ContextType>;
  userErrors: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnRequestConnectionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnRequestConnection'] = ApiResolversParentTypes['OrderReturnRequestConnection']> = {
  edges: Resolver<Array<ApiResolversTypes['OrderReturnRequestEdge']>, ParentType, ContextType>;
  nodes: Resolver<Array<ApiResolversTypes['OrderReturnRequest']>, ParentType, ContextType>;
  pageInfo: Resolver<ApiResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnRequestCreatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnRequestCreatePayload'] = ApiResolversParentTypes['OrderReturnRequestCreatePayload']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  returnRequest: Resolver<Maybe<ApiResolversTypes['OrderReturnRequest']>, ParentType, ContextType>;
  userErrors: Resolver<Array<ApiResolversTypes['OrderUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnRequestEdgeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnRequestEdge'] = ApiResolversParentTypes['OrderReturnRequestEdge']> = {
  cursor: Resolver<ApiResolversTypes['Cursor'], ParentType, ContextType>;
  node: Resolver<ApiResolversTypes['OrderReturnRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderReturnRequestLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderReturnRequestLine'] = ApiResolversParentTypes['OrderReturnRequestLine']> = {
  note: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  orderLine: Resolver<ApiResolversTypes['OrderLine'], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  reason: Resolver<ApiResolversTypes['OrderReturnReason'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderSelfServiceResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderSelfService'] = ApiResolversParentTypes['OrderSelfService']> = {
  cancel: Resolver<ApiResolversTypes['OrderSelfServiceAction'], ParentType, ContextType>;
  reorder: Resolver<ApiResolversTypes['OrderSelfServiceAction'], ParentType, ContextType>;
  requestReturn: Resolver<ApiResolversTypes['OrderSelfServiceAction'], ParentType, ContextType>;
  retryPayment: Resolver<ApiResolversTypes['OrderSelfServiceAction'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderSelfServiceActionResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderSelfServiceAction'] = ApiResolversParentTypes['OrderSelfServiceAction']> = {
  available: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  unavailableReason: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  unavailableReasonCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderShipmentResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderShipment'] = ApiResolversParentTypes['OrderShipment']> = {
  carrierCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  carrierName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  deliveredAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  estimatedDeliveryAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  events: Resolver<Array<ApiResolversTypes['OrderTrackingEvent']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  serviceCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  shippedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderShipmentStatus'], ParentType, ContextType>;
  tracking: Resolver<Array<ApiResolversTypes['OrderTrackingInfo']>, ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderTrackingEventResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderTrackingEvent'] = ApiResolversParentTypes['OrderTrackingEvent']> = {
  happenedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  location: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  message: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderShipmentStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderTrackingInfoResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderTrackingInfo'] = ApiResolversParentTypes['OrderTrackingInfo']> = {
  company: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  number: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  url: Resolver<Maybe<ApiResolversTypes['URL']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderUserErrorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderUserError'] = ApiResolversParentTypes['OrderUserError']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  field: Resolver<Maybe<Array<ApiResolversTypes['String']>>, ParentType, ContextType>;
  message: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  retryable: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderVoidResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderVoid'] = ApiResolversParentTypes['OrderVoid']> = {
  amount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  processedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  reason: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderVoidStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPageInfoResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['PageInfo'] = ApiResolversParentTypes['PageInfo']> = {
  endCursor: Resolver<Maybe<ApiResolversTypes['Cursor']>, ParentType, ContextType>;
  hasNextPage: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor: Resolver<Maybe<ApiResolversTypes['Cursor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Query'] = ApiResolversParentTypes['Query']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType, RequireFields<ApiQueryOrderArgs, 'id'>>;
  orderReturnRequest: Resolver<Maybe<ApiResolversTypes['OrderReturnRequest']>, ParentType, ContextType, RequireFields<ApiQueryOrderReturnRequestArgs, 'id'>>;
};

export type ApiRichTextResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['RichText'] = ApiResolversParentTypes['RichText']> = {
  html: Resolver<ApiResolversTypes['HTML'], ParentType, ContextType>;
  json: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  text: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiUrlScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['URL'], any> {
  name: 'URL';
}

export interface ApiUnsignedInt64ScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['UnsignedInt64'], any> {
  name: 'UnsignedInt64';
}

export type ApiUserErrorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['UserError'] = ApiResolversParentTypes['UserError']> = {
  field: Resolver<Maybe<Array<ApiResolversTypes['String']>>, ParentType, ContextType>;
  message: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiWeightResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Weight'] = ApiResolversParentTypes['Weight']> = {
  unit: Resolver<ApiResolversTypes['WeightUnit'], ParentType, ContextType>;
  value: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiResolvers<ContextType = GraphQLContext> = {
  BigInt: GraphQLScalarType;
  Checkout: ApiCheckoutResolvers<ContextType>;
  Color: GraphQLScalarType;
  Connection: ApiConnectionResolvers<ContextType>;
  Cursor: GraphQLScalarType;
  Customer: ApiCustomerResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  Decimal: GraphQLScalarType;
  Dimensions: ApiDimensionsResolvers<ContextType>;
  DisplayableError: ApiDisplayableErrorResolvers<ContextType>;
  Email: GraphQLScalarType;
  HTML: GraphQLScalarType;
  ISO8601DateTime: GraphQLScalarType;
  JSON: GraphQLScalarType;
  Money: ApiMoneyResolvers<ContextType>;
  Mutation: ApiMutationResolvers<ContextType>;
  Node: ApiNodeResolvers<ContextType>;
  Order: ApiOrderResolvers<ContextType>;
  OrderCancelPayload: ApiOrderCancelPayloadResolvers<ContextType>;
  OrderConnection: ApiOrderConnectionResolvers<ContextType>;
  OrderCost: ApiOrderCostResolvers<ContextType>;
  OrderCustomerIdentity: ApiOrderCustomerIdentityResolvers<ContextType>;
  OrderDeliveryAddress: ApiOrderDeliveryAddressResolvers<ContextType>;
  OrderDeliveryGroup: ApiOrderDeliveryGroupResolvers<ContextType>;
  OrderDeliveryMethod: ApiOrderDeliveryMethodResolvers<ContextType>;
  OrderEdge: ApiOrderEdgeResolvers<ContextType>;
  OrderFulfillment: ApiOrderFulfillmentResolvers<ContextType>;
  OrderFulfillmentLine: ApiOrderFulfillmentLineResolvers<ContextType>;
  OrderLine: ApiOrderLineResolvers<ContextType>;
  OrderLineCost: ApiOrderLineCostResolvers<ContextType>;
  OrderLineReturnEligibility: ApiOrderLineReturnEligibilityResolvers<ContextType>;
  OrderPayment: ApiOrderPaymentResolvers<ContextType>;
  OrderPaymentCustomerAction: ApiOrderPaymentCustomerActionResolvers<ContextType>;
  OrderPaymentMethod: ApiOrderPaymentMethodResolvers<ContextType>;
  OrderPaymentRetry: ApiOrderPaymentRetryResolvers<ContextType>;
  OrderPaymentRetryPayload: ApiOrderPaymentRetryPayloadResolvers<ContextType>;
  OrderPaymentTransaction: ApiOrderPaymentTransactionResolvers<ContextType>;
  OrderPromoCode: ApiOrderPromoCodeResolvers<ContextType>;
  OrderRecipient: ApiOrderRecipientResolvers<ContextType>;
  OrderRefund: ApiOrderRefundResolvers<ContextType>;
  OrderRefundLine: ApiOrderRefundLineResolvers<ContextType>;
  OrderReorderPayload: ApiOrderReorderPayloadResolvers<ContextType>;
  OrderReorderSkippedLine: ApiOrderReorderSkippedLineResolvers<ContextType>;
  OrderReturnRequest: ApiOrderReturnRequestResolvers<ContextType>;
  OrderReturnRequestCancelPayload: ApiOrderReturnRequestCancelPayloadResolvers<ContextType>;
  OrderReturnRequestConnection: ApiOrderReturnRequestConnectionResolvers<ContextType>;
  OrderReturnRequestCreatePayload: ApiOrderReturnRequestCreatePayloadResolvers<ContextType>;
  OrderReturnRequestEdge: ApiOrderReturnRequestEdgeResolvers<ContextType>;
  OrderReturnRequestLine: ApiOrderReturnRequestLineResolvers<ContextType>;
  OrderSelfService: ApiOrderSelfServiceResolvers<ContextType>;
  OrderSelfServiceAction: ApiOrderSelfServiceActionResolvers<ContextType>;
  OrderShipment: ApiOrderShipmentResolvers<ContextType>;
  OrderTrackingEvent: ApiOrderTrackingEventResolvers<ContextType>;
  OrderTrackingInfo: ApiOrderTrackingInfoResolvers<ContextType>;
  OrderUserError: ApiOrderUserErrorResolvers<ContextType>;
  OrderVoid: ApiOrderVoidResolvers<ContextType>;
  PageInfo: ApiPageInfoResolvers<ContextType>;
  Query: ApiQueryResolvers<ContextType>;
  RichText: ApiRichTextResolvers<ContextType>;
  URL: GraphQLScalarType;
  UnsignedInt64: GraphQLScalarType;
  UserError: ApiUserErrorResolvers<ContextType>;
  Weight: ApiWeightResolvers<ContextType>;
};
