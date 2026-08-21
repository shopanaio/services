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
  /** An ISO 8601 calendar date in YYYY-MM-DD form. */
  Date: { input: string; output: string; }
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
  JSON: { input: unknown; output: unknown; }
  /** An RFC 3986 and RFC 3987 compliant URI string. */
  URL: { input: string; output: string; }
  /** An unsigned 64-bit integer serialized as a decimal string. */
  UnsignedInt64: { input: string; output: string; }
  _FieldSet: { input: any; output: any; }
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

/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type Customer = {
  __typename?: 'Customer';
  /** Store-account enrollment state. */
  accountStatus: CustomerAccountStatus;
  /** One address owned by the customer; inaccessible IDs return null. */
  address: Maybe<CustomerAddress>;
  /** Customer addresses in deterministic creation order. */
  addresses: CustomerAddressConnection;
  companyName: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** One privacy request owned by the customer; inaccessible IDs return null. */
  dataRequest: Maybe<CustomerDataRequest>;
  /** Auditable privacy requests created by the customer. */
  dataRequests: CustomerDataRequestConnection;
  dateOfBirth: Maybe<Scalars['Date']['output']>;
  /** Default address used for billing and tax calculations. */
  defaultBillingAddress: Maybe<CustomerAddress>;
  /** Default address used for physical fulfillment. */
  defaultShippingAddress: Maybe<CustomerAddress>;
  /** The customer's primary wishlist, when one has been created. */
  defaultWishlist: Maybe<CustomerWishlist>;
  /** Display name derived from available profile and contact information. */
  displayName: Scalars['String']['output'];
  /** Authenticated customer's email projection and verification state. */
  emailAddress: Maybe<CustomerEmailAddress>;
  firstName: Maybe<Scalars['String']['output']>;
  /** Customer-provided gender value. */
  gender: Maybe<Scalars['String']['output']>;
  /** Globally unique customer ID. */
  id: Scalars['ID']['output'];
  jobTitle: Maybe<Scalars['String']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  /** Current marketing preferences for every configured channel. */
  marketingConsents: Array<CustomerMarketingConsent>;
  middleName: Maybe<Scalars['String']['output']>;
  /** Authenticated customer's phone projection and verification state. */
  phoneNumber: Maybe<CustomerPhoneNumber>;
  /** Customer-selected BCP 47 locale. */
  preferredLocale: Maybe<Scalars['String']['output']>;
  prefix: Maybe<Scalars['String']['output']>;
  /** Revision used for optimistic concurrency on customer-owned writes. */
  revision: Scalars['Int']['output'];
  suffix: Maybe<Scalars['String']['output']>;
  /** Merchant-approved tax exemptions visible to this customer. */
  taxExemptions: CustomerTaxExemptionConnection;
  /** Customer-owned tax identifiers. */
  taxIdentifiers: CustomerTaxIdentifierConnection;
  updatedAt: Scalars['DateTime']['output'];
  /** One wishlist owned by the customer; inaccessible IDs return null. */
  wishlist: Maybe<CustomerWishlist>;
  /**
   * Wishlist collections owned by the authenticated customer.
   *
   * Results are ordered by creation time ascending and then by ID ascending.
   * Omitting all pagination arguments returns the first 20 entries. At most 100
   * entries can be requested in either direction.
   */
  wishlists: CustomerWishlistConnection;
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerAddressArgs = {
  id: Scalars['ID']['input'];
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerAddressesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerDataRequestArgs = {
  id: Scalars['ID']['input'];
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerDataRequestsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerTaxExemptionsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerTaxIdentifiersArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerWishlistArgs = {
  id: Scalars['ID']['input'];
};


/**
 * The canonical storefront customer entity owned by the Customers service.
 *
 * Authentication credentials, sessions, verification challenges, and linked
 * identity providers are owned by IAM and deliberately do not appear here.
 */
export type CustomerWishlistsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Storefront-visible state of the customer's store account. */
export enum CustomerAccountStatus {
  /** A checkout-created profile that is not linked to an IAM principal. */
  Guest = 'GUEST',
  /** A profile for which account enrollment has been initiated. */
  Invited = 'INVITED',
  /** A profile linked to a registered IAM principal. */
  Registered = 'REGISTERED'
}

/** A normalized international mailing address owned by the current customer. */
export type CustomerAddress = Node & {
  __typename?: 'CustomerAddress';
  address1: Scalars['String']['output'];
  address2: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  company: Maybe<Scalars['String']['output']>;
  country: Maybe<Scalars['String']['output']>;
  countryCode: CountryCode;
  createdAt: Scalars['DateTime']['output'];
  firstName: Maybe<Scalars['String']['output']>;
  formatted: Array<Scalars['String']['output']>;
  formattedArea: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isDefaultBilling: Scalars['Boolean']['output'];
  isDefaultShipping: Scalars['Boolean']['output'];
  label: Maybe<Scalars['String']['output']>;
  lastName: Maybe<Scalars['String']['output']>;
  middleName: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone: Maybe<Scalars['String']['output']>;
  prefix: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  provinceCode: Maybe<Scalars['String']['output']>;
  suffix: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  validatedAt: Maybe<Scalars['DateTime']['output']>;
  validationStatus: CustomerAddressValidationStatus;
  zip: Maybe<Scalars['String']['output']>;
};

export type CustomerAddressConnection = Connection & {
  __typename?: 'CustomerAddressConnection';
  edges: Array<CustomerAddressEdge>;
  nodes: Array<CustomerAddress>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerAddressCreateInput = {
  address: CustomerAddressInput;
  defaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  defaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  idempotencyKey: Scalars['String']['input'];
};

export type CustomerAddressCreatePayload = {
  __typename?: 'CustomerAddressCreatePayload';
  customer: Maybe<Customer>;
  customerAddress: Maybe<CustomerAddress>;
  userErrors: Array<CustomerUserError>;
};

/** Atomically sets or clears either customer address default. */
export type CustomerAddressDefaultSetInput = {
  /** Null clears the selected default. */
  addressId?: InputMaybe<Scalars['ID']['input']>;
  /** One or both defaults to assign or clear. */
  defaults: Array<CustomerAddressDefaultType>;
  idempotencyKey: Scalars['String']['input'];
};

export type CustomerAddressDefaultSetPayload = {
  __typename?: 'CustomerAddressDefaultSetPayload';
  customer: Maybe<Customer>;
  userErrors: Array<CustomerUserError>;
};

export enum CustomerAddressDefaultType {
  Billing = 'BILLING',
  Shipping = 'SHIPPING'
}

export type CustomerAddressDeleteInput = {
  addressId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
};

export type CustomerAddressDeletePayload = {
  __typename?: 'CustomerAddressDeletePayload';
  customer: Maybe<Customer>;
  deletedAddressId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<CustomerUserError>;
};

export type CustomerAddressEdge = {
  __typename?: 'CustomerAddressEdge';
  cursor: Scalars['Cursor']['output'];
  node: CustomerAddress;
};

/** Portable international mailing-address values. */
export type CustomerAddressInput = {
  address1: Scalars['String']['input'];
  address2?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  company?: InputMaybe<Scalars['String']['input']>;
  countryCode: CountryCode;
  firstName?: InputMaybe<Scalars['String']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  provinceCode?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
  zip?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerAddressUpdateInput = {
  address: CustomerAddressInput;
  addressId: Scalars['ID']['input'];
  defaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  defaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  idempotencyKey: Scalars['String']['input'];
};

export type CustomerAddressUpdatePayload = {
  __typename?: 'CustomerAddressUpdatePayload';
  customer: Maybe<Customer>;
  customerAddress: Maybe<CustomerAddress>;
  userErrors: Array<CustomerUserError>;
};

/** Server-side normalization and validation state for an address. */
export enum CustomerAddressValidationStatus {
  Invalid = 'INVALID',
  Unvalidated = 'UNVALIDATED',
  Valid = 'VALID'
}

/** Values used to clear one category-based product comparison. */
export type CustomerComparisonCategoryClearInput = {
  /** Current Catalog category whose selected variants must be removed. */
  categoryId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
};

/** Result of changing the authenticated customer's comparison selection. */
export type CustomerComparisonMutationPayload = {
  __typename?: 'CustomerComparisonMutationPayload';
  /**
   * Customer whose presentation models can be refetched through the Catalog-owned
   * Customer.productComparisons federation field.
   */
  customer: Maybe<Customer>;
  /** New persisted selection revision, or null when the operation failed. */
  revision: Maybe<Scalars['Int']['output']>;
  userErrors: Array<CustomerUserError>;
};

/** Values used to add one concrete variant to product comparisons. */
export type CustomerComparisonVariantAddInput = {
  idempotencyKey: Scalars['String']['input'];
  /** Published Catalog variant to add in the current storefront context. */
  variantId: Scalars['ID']['input'];
};

/** Values used to remove one concrete variant from product comparisons. */
export type CustomerComparisonVariantRemoveInput = {
  idempotencyKey: Scalars['String']['input'];
  /** Catalog variant to remove from the authenticated customer's selection. */
  variantId: Scalars['ID']['input'];
};

/** A customer-created, auditable privacy workflow. */
export type CustomerDataRequest = Node & {
  __typename?: 'CustomerDataRequest';
  /** Customer-provided details for a correction request, when applicable. */
  correctionDetails: Maybe<Scalars['JSON']['output']>;
  dueAt: Maybe<Scalars['DateTime']['output']>;
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  rejectionReason: Maybe<Scalars['String']['output']>;
  requestedAt: Scalars['DateTime']['output'];
  resultFile: Maybe<GenericFile>;
  startedAt: Maybe<Scalars['DateTime']['output']>;
  status: CustomerDataRequestStatus;
  type: CustomerDataRequestType;
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerDataRequestCancelInput = {
  dataRequestId: Scalars['ID']['input'];
  expectedUpdatedAt: Scalars['DateTime']['input'];
  idempotencyKey: Scalars['String']['input'];
};

export type CustomerDataRequestCancelPayload = {
  __typename?: 'CustomerDataRequestCancelPayload';
  dataRequest: Maybe<CustomerDataRequest>;
  userErrors: Array<CustomerUserError>;
};

export type CustomerDataRequestConnection = Connection & {
  __typename?: 'CustomerDataRequestConnection';
  edges: Array<CustomerDataRequestEdge>;
  nodes: Array<CustomerDataRequest>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerDataRequestCreateInput = {
  /** Required only for CORRECTION and rejected for all other request types. */
  correctionDetails?: InputMaybe<Scalars['JSON']['input']>;
  idempotencyKey: Scalars['String']['input'];
  type: CustomerDataRequestType;
};

export type CustomerDataRequestCreatePayload = {
  __typename?: 'CustomerDataRequestCreatePayload';
  dataRequest: Maybe<CustomerDataRequest>;
  userErrors: Array<CustomerUserError>;
};

export type CustomerDataRequestEdge = {
  __typename?: 'CustomerDataRequestEdge';
  cursor: Scalars['Cursor']['output'];
  node: CustomerDataRequest;
};

export enum CustomerDataRequestStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export enum CustomerDataRequestType {
  Access = 'ACCESS',
  Correction = 'CORRECTION',
  Erasure = 'ERASURE',
  Export = 'EXPORT'
}

/** The authenticated customer's email projection. */
export type CustomerEmailAddress = {
  __typename?: 'CustomerEmailAddress';
  emailAddress: Scalars['Email']['output'];
  marketingConsent: Maybe<CustomerMarketingConsent>;
  verified: Scalars['Boolean']['output'];
};

/** Current customer-selectable consent for one marketing channel. */
export type CustomerMarketingConsent = {
  __typename?: 'CustomerMarketingConsent';
  channel: CustomerMarketingConsentChannel;
  consentedAt: Maybe<Scalars['DateTime']['output']>;
  optInLevel: CustomerMarketingConsentOptInLevel;
  state: CustomerMarketingConsentState;
  updatedAt: Scalars['DateTime']['output'];
  withdrawnAt: Maybe<Scalars['DateTime']['output']>;
};

export enum CustomerMarketingConsentChannel {
  Email = 'EMAIL',
  Push = 'PUSH',
  Sms = 'SMS',
  Whatsapp = 'WHATSAPP'
}

export enum CustomerMarketingConsentOptInLevel {
  ConfirmedOptIn = 'CONFIRMED_OPT_IN',
  SingleOptIn = 'SINGLE_OPT_IN',
  Unknown = 'UNKNOWN'
}

export enum CustomerMarketingConsentState {
  Invalid = 'INVALID',
  NotSubscribed = 'NOT_SUBSCRIBED',
  Pending = 'PENDING',
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

/**
 * Customer-selectable target states. Pending/invalid states are produced only by
 * the server and cannot be selected directly.
 */
export enum CustomerMarketingConsentTargetState {
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export type CustomerMarketingConsentUpdateInput = {
  channel: CustomerMarketingConsentChannel;
  idempotencyKey: Scalars['String']['input'];
  state: CustomerMarketingConsentTargetState;
};

export type CustomerMarketingConsentUpdatePayload = {
  __typename?: 'CustomerMarketingConsentUpdatePayload';
  customer: Maybe<Customer>;
  marketingConsent: Maybe<CustomerMarketingConsent>;
  userErrors: Array<CustomerUserError>;
};

/** The authenticated customer's phone projection. */
export type CustomerPhoneNumber = {
  __typename?: 'CustomerPhoneNumber';
  marketingConsent: Maybe<CustomerMarketingConsent>;
  phoneNumber: Scalars['String']['output'];
  verified: Scalars['Boolean']['output'];
};

/** A merchant-approved tax exemption. Customers cannot grant exemptions. */
export type CustomerTaxExemption = Node & {
  __typename?: 'CustomerTaxExemption';
  certificateFile: Maybe<GenericFile>;
  code: Scalars['String']['output'];
  countryCode: Maybe<CountryCode>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  reason: Maybe<Scalars['String']['output']>;
  regionCode: Maybe<Scalars['String']['output']>;
  status: CustomerTaxExemptionStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom: Maybe<Scalars['Date']['output']>;
  validTo: Maybe<Scalars['Date']['output']>;
};

export type CustomerTaxExemptionConnection = Connection & {
  __typename?: 'CustomerTaxExemptionConnection';
  edges: Array<CustomerTaxExemptionEdge>;
  nodes: Array<CustomerTaxExemption>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTaxExemptionEdge = {
  __typename?: 'CustomerTaxExemptionEdge';
  cursor: Scalars['Cursor']['output'];
  node: CustomerTaxExemption;
};

export enum CustomerTaxExemptionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED'
}

/** A customer-provided tax identifier whose status is controlled by Shopana. */
export type CustomerTaxIdentifier = Node & {
  __typename?: 'CustomerTaxIdentifier';
  countryCode: Maybe<CountryCode>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  identifierType: Scalars['String']['output'];
  isPrimary: Scalars['Boolean']['output'];
  status: CustomerTaxIdentifierStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom: Maybe<Scalars['Date']['output']>;
  validTo: Maybe<Scalars['Date']['output']>;
  value: Scalars['String']['output'];
  verifiedAt: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerTaxIdentifierConnection = Connection & {
  __typename?: 'CustomerTaxIdentifierConnection';
  edges: Array<CustomerTaxIdentifierEdge>;
  nodes: Array<CustomerTaxIdentifier>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerTaxIdentifierCreateInput = {
  countryCode?: InputMaybe<CountryCode>;
  idempotencyKey: Scalars['String']['input'];
  identifierType: Scalars['String']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  value: Scalars['String']['input'];
};

export type CustomerTaxIdentifierCreatePayload = {
  __typename?: 'CustomerTaxIdentifierCreatePayload';
  customer: Maybe<Customer>;
  taxIdentifier: Maybe<CustomerTaxIdentifier>;
  userErrors: Array<CustomerUserError>;
};

export type CustomerTaxIdentifierDeleteInput = {
  idempotencyKey: Scalars['String']['input'];
  taxIdentifierId: Scalars['ID']['input'];
};

export type CustomerTaxIdentifierDeletePayload = {
  __typename?: 'CustomerTaxIdentifierDeletePayload';
  customer: Maybe<Customer>;
  deletedTaxIdentifierId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<CustomerUserError>;
};

export type CustomerTaxIdentifierEdge = {
  __typename?: 'CustomerTaxIdentifierEdge';
  cursor: Scalars['Cursor']['output'];
  node: CustomerTaxIdentifier;
};

export enum CustomerTaxIdentifierStatus {
  Expired = 'EXPIRED',
  Rejected = 'REJECTED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type CustomerTaxIdentifierUpdateInput = {
  countryCode?: InputMaybe<CountryCode>;
  idempotencyKey: Scalars['String']['input'];
  identifierType?: InputMaybe<Scalars['String']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  taxIdentifierId: Scalars['ID']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerTaxIdentifierUpdatePayload = {
  __typename?: 'CustomerTaxIdentifierUpdatePayload';
  customer: Maybe<Customer>;
  taxIdentifier: Maybe<CustomerTaxIdentifier>;
  userErrors: Array<CustomerUserError>;
};

/**
 * Customer-editable, non-authentication profile fields. Email and phone changes
 * use IAM verification workflows and arrive here as verified projections.
 */
export type CustomerUpdateInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey: Scalars['String']['input'];
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

/** Result of updating the authenticated customer's profile. */
export type CustomerUpdatePayload = {
  __typename?: 'CustomerUpdatePayload';
  customer: Maybe<Customer>;
  userErrors: Array<CustomerUserError>;
};

/** A customer-facing validation, ownership, dependency, or business error. */
export type CustomerUserError = DisplayableError & {
  __typename?: 'CustomerUserError';
  /** Current comparison revision when code is REVISION_CONFLICT. */
  actualRevision: Maybe<Scalars['Int']['output']>;
  code: Scalars['String']['output'];
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
  retryable: Scalars['Boolean']['output'];
};

/**
 * A named, private collection of products saved by the authenticated customer.
 *
 * Wishlist ownership is scoped to both the current store and customer. A
 * customer can have multiple wishlists, but exactly one existing wishlist is the
 * default. Wishlists are never shared between customers.
 */
export type CustomerWishlist = Node & {
  __typename?: 'CustomerWishlist';
  /** Date and time when the wishlist was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Customer who owns this wishlist. */
  customer: Customer;
  /** Globally unique CustomerWishlist ID. */
  id: Scalars['ID']['output'];
  /**
   * Whether this is the customer's primary wishlist.
   *
   * A default wishlist can be renamed but cannot be deleted.
   */
  isDefault: Scalars['Boolean']['output'];
  /**
   * Products saved in this wishlist.
   *
   * Results are ordered by addition time descending and then by ID descending.
   * Omitting all pagination arguments returns the first 20 entries. At most 100
   * entries can be requested in either direction.
   */
  items: CustomerWishlistItemConnection;
  /** Customer-visible name after surrounding whitespace has been removed. */
  name: Scalars['String']['output'];
  /** Date and time when the wishlist was last renamed or otherwise updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/**
 * A named, private collection of products saved by the authenticated customer.
 *
 * Wishlist ownership is scoped to both the current store and customer. A
 * customer can have multiple wishlists, but exactly one existing wishlist is the
 * default. Wishlists are never shared between customers.
 */
export type CustomerWishlistItemsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A Relay connection containing customer wishlists. */
export type CustomerWishlistConnection = Connection & {
  __typename?: 'CustomerWishlistConnection';
  /** Wishlist edges in deterministic cursor order. */
  edges: Array<CustomerWishlistEdge>;
  /** Wishlists contained in the returned page. */
  nodes: Array<CustomerWishlist>;
  /** Information needed to request adjacent pages. */
  pageInfo: PageInfo;
  /** Total number of wishlists owned by the authenticated customer. */
  totalCount: Scalars['Int']['output'];
};

/** A cursor and the customer wishlist at that cursor. */
export type CustomerWishlistEdge = {
  __typename?: 'CustomerWishlistEdge';
  /** Opaque cursor for this wishlist in the current connection. */
  cursor: Scalars['Cursor']['output'];
  /** Wishlist at the end of the edge. */
  node: CustomerWishlist;
};

/** One product saved in a customer wishlist. */
export type CustomerWishlistItem = Node & {
  __typename?: 'CustomerWishlistItem';
  /** Date and time when the product was added to the wishlist. */
  addedAt: Scalars['DateTime']['output'];
  /** Globally unique CustomerWishlistItem ID. */
  id: Scalars['ID']['output'];
  /**
   * The currently published storefront product represented by this item.
   *
   * The saved item remains present when the product is unpublished. This field
   * is null when the product is unpublished, deleted, belongs to another store,
   * or its federated reference cannot be resolved.
   */
  product: Maybe<Product>;
  /** Wishlist containing this saved item. */
  wishlist: CustomerWishlist;
};

/** A Relay connection containing items from one customer wishlist. */
export type CustomerWishlistItemConnection = Connection & {
  __typename?: 'CustomerWishlistItemConnection';
  /** Wishlist item edges in deterministic cursor order. */
  edges: Array<CustomerWishlistItemEdge>;
  /** Wishlist items contained in the returned page. */
  nodes: Array<CustomerWishlistItem>;
  /** Information needed to request adjacent pages. */
  pageInfo: PageInfo;
  /** Total number of products saved in the wishlist. */
  totalCount: Scalars['Int']['output'];
};

/** A cursor and the customer wishlist item at that cursor. */
export type CustomerWishlistItemEdge = {
  __typename?: 'CustomerWishlistItemEdge';
  /** Opaque cursor for this item in the current connection. */
  cursor: Scalars['Cursor']['output'];
  /** Wishlist item at the end of the edge. */
  node: CustomerWishlistItem;
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

export type GenericFile = {
  __typename?: 'GenericFile';
  id: Scalars['ID']['output'];
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

/** A precise monetary value with its associated currency. */
export type Money = {
  __typename?: 'Money';
  amount: Scalars['Decimal']['output'];
  currencyCode: CurrencyCode;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Creates a mailing address owned by the current customer. */
  customerAddressCreate: CustomerAddressCreatePayload;
  /** Atomically sets or clears shipping and billing address defaults. */
  customerAddressDefaultSet: CustomerAddressDefaultSetPayload;
  /** Deletes a mailing address owned by the current customer. */
  customerAddressDelete: CustomerAddressDeletePayload;
  /** Updates a mailing address owned by the current customer. */
  customerAddressUpdate: CustomerAddressUpdatePayload;
  /** Removes every selected variant currently grouped under one category. */
  customerComparisonCategoryClear: CustomerComparisonMutationPayload;
  /** Adds one concrete Catalog variant to the customer's comparisons. */
  customerComparisonVariantAdd: CustomerComparisonMutationPayload;
  /** Removes one concrete Catalog variant from the customer's comparisons. */
  customerComparisonVariantRemove: CustomerComparisonMutationPayload;
  /** Cancels a pending privacy request owned by the current customer. */
  customerDataRequestCancel: CustomerDataRequestCancelPayload;
  /** Creates an auditable privacy request for the current customer. */
  customerDataRequestCreate: CustomerDataRequestCreatePayload;
  /** Transitions one customer-selectable marketing consent channel. */
  customerMarketingConsentUpdate: CustomerMarketingConsentUpdatePayload;
  /** Creates an unverified tax identifier for the current customer. */
  customerTaxIdentifierCreate: CustomerTaxIdentifierCreatePayload;
  /** Deletes a customer-owned tax identifier. */
  customerTaxIdentifierDelete: CustomerTaxIdentifierDeletePayload;
  /** Updates a customer-owned tax identifier and resets its verification. */
  customerTaxIdentifierUpdate: CustomerTaxIdentifierUpdatePayload;
  /** Updates non-authentication profile fields for the current customer. */
  customerUpdate: CustomerUpdatePayload;
  /** Creates a wishlist for the authenticated customer. */
  wishlistCreate: WishlistCreatePayload;
  /** Deletes a non-default wishlist owned by the authenticated customer. */
  wishlistDelete: WishlistDeletePayload;
  /** Adds a published product to a customer-owned wishlist. */
  wishlistProductAdd: WishlistProductAddPayload;
  /** Removes a saved product item owned by the authenticated customer. */
  wishlistProductRemove: WishlistProductRemovePayload;
  /** Renames a wishlist owned by the authenticated customer. */
  wishlistUpdate: WishlistUpdatePayload;
};


export type MutationCustomerAddressCreateArgs = {
  input: CustomerAddressCreateInput;
};


export type MutationCustomerAddressDefaultSetArgs = {
  input: CustomerAddressDefaultSetInput;
};


export type MutationCustomerAddressDeleteArgs = {
  input: CustomerAddressDeleteInput;
};


export type MutationCustomerAddressUpdateArgs = {
  input: CustomerAddressUpdateInput;
};


export type MutationCustomerComparisonCategoryClearArgs = {
  input: CustomerComparisonCategoryClearInput;
};


export type MutationCustomerComparisonVariantAddArgs = {
  input: CustomerComparisonVariantAddInput;
};


export type MutationCustomerComparisonVariantRemoveArgs = {
  input: CustomerComparisonVariantRemoveInput;
};


export type MutationCustomerDataRequestCancelArgs = {
  input: CustomerDataRequestCancelInput;
};


export type MutationCustomerDataRequestCreateArgs = {
  input: CustomerDataRequestCreateInput;
};


export type MutationCustomerMarketingConsentUpdateArgs = {
  input: CustomerMarketingConsentUpdateInput;
};


export type MutationCustomerTaxIdentifierCreateArgs = {
  input: CustomerTaxIdentifierCreateInput;
};


export type MutationCustomerTaxIdentifierDeleteArgs = {
  input: CustomerTaxIdentifierDeleteInput;
};


export type MutationCustomerTaxIdentifierUpdateArgs = {
  input: CustomerTaxIdentifierUpdateInput;
};


export type MutationCustomerUpdateArgs = {
  input: CustomerUpdateInput;
};


export type MutationWishlistCreateArgs = {
  input: WishlistCreateInput;
};


export type MutationWishlistDeleteArgs = {
  input: WishlistDeleteInput;
};


export type MutationWishlistProductAddArgs = {
  input: WishlistProductAddInput;
};


export type MutationWishlistProductRemoveArgs = {
  input: WishlistProductRemoveInput;
};


export type MutationWishlistUpdateArgs = {
  input: WishlistUpdateInput;
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
 * A storefront Catalog product referenced by a wishlist item.
 *
 * The Customers subgraph stores only the product ID and does not resolve Product
 * entities. Published product data is provided by the Catalog subgraph.
 */
export type Product = {
  __typename?: 'Product';
  /** Globally unique Product ID. */
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /**
   * Returns the customer associated with the authenticated storefront session.
   * Identity and store ownership are resolved only from trusted request context.
   */
  customer: Maybe<Customer>;
};

/** Localized rich text in plain text, HTML, and structured JSON formats. */
export type RichText = {
  __typename?: 'RichText';
  html: Scalars['HTML']['output'];
  json: Scalars['JSON']['output'];
  text: Scalars['String']['output'];
};

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

/** Values used to create a customer wishlist. */
export type WishlistCreateInput = {
  /** Makes retries return the original result instead of creating a duplicate. */
  idempotencyKey: Scalars['String']['input'];
  /**
   * Customer-visible wishlist name.
   *
   * Surrounding whitespace is removed before storage. The resulting value must
   * contain between 1 and 128 Unicode characters. Names are unique for the
   * authenticated customer after Unicode NFKC normalization and
   * locale-independent lowercase conversion.
   */
  name: Scalars['String']['input'];
};

/** Result of creating a customer wishlist. */
export type WishlistCreatePayload = {
  __typename?: 'WishlistCreatePayload';
  /** Validation, ownership, and business errors produced by the operation. */
  userErrors: Array<CustomerUserError>;
  /** The created wishlist, or null when creation failed. */
  wishlist: Maybe<CustomerWishlist>;
};

export type WishlistDeleteInput = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  id: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
};

/** Result of deleting a non-default customer wishlist. */
export type WishlistDeletePayload = {
  __typename?: 'WishlistDeletePayload';
  /** Global ID of the deleted wishlist, or null when nothing was deleted. */
  deletedWishlistId: Maybe<Scalars['ID']['output']>;
  /** Validation, ownership, and business errors produced by the operation. */
  userErrors: Array<CustomerUserError>;
};

export type WishlistProductAddInput = {
  idempotencyKey: Scalars['String']['input'];
  productId: Scalars['ID']['input'];
  wishlistId?: InputMaybe<Scalars['ID']['input']>;
};

/** Result of adding a published product to a customer wishlist. */
export type WishlistProductAddPayload = {
  __typename?: 'WishlistProductAddPayload';
  /**
   * Validation, ownership, Catalog availability, and business errors produced by
   * the operation.
   */
  userErrors: Array<CustomerUserError>;
  /**
   * The created or previously existing wishlist item, or null when the operation
   * failed.
   */
  wishlistItem: Maybe<CustomerWishlistItem>;
};

export type WishlistProductRemoveInput = {
  idempotencyKey: Scalars['String']['input'];
  itemId: Scalars['ID']['input'];
};

/** Result of removing a product item from a customer wishlist. */
export type WishlistProductRemovePayload = {
  __typename?: 'WishlistProductRemovePayload';
  /** Global ID of the removed item, or null when nothing was removed. */
  deletedWishlistItemId: Maybe<Scalars['ID']['output']>;
  /** Validation, ownership, and business errors produced by the operation. */
  userErrors: Array<CustomerUserError>;
};

/** Values used to rename a customer wishlist. */
export type WishlistUpdateInput = {
  /** Timestamp observed by the client before editing the wishlist. */
  expectedUpdatedAt: Scalars['DateTime']['input'];
  /** Global ID of the wishlist to rename. */
  id: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
  /**
   * New customer-visible wishlist name.
   *
   * Surrounding whitespace is removed before storage. The resulting value must
   * contain between 1 and 128 Unicode characters. Names are unique for the
   * authenticated customer after Unicode NFKC normalization and
   * locale-independent lowercase conversion.
   */
  name: Scalars['String']['input'];
};

/** Result of renaming a customer wishlist. */
export type WishlistUpdatePayload = {
  __typename?: 'WishlistUpdatePayload';
  /** Validation, ownership, and business errors produced by the operation. */
  userErrors: Array<CustomerUserError>;
  /** The updated wishlist, or null when the update failed. */
  wishlist: Maybe<CustomerWishlist>;
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
  Connection: ( CustomerAddressConnection ) | ( CustomerDataRequestConnection ) | ( CustomerTaxExemptionConnection ) | ( CustomerTaxIdentifierConnection ) | ( CustomerWishlistConnection ) | ( CustomerWishlistItemConnection );
  DisplayableError: ( CustomerUserError ) | ( UserError );
  Node: ( CustomerAddress ) | ( CustomerDataRequest ) | ( CustomerTaxExemption ) | ( CustomerTaxIdentifier ) | ( CustomerWishlist ) | ( CustomerWishlistItem );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Color: ResolverTypeWrapper<Scalars['Color']['output']>;
  Connection: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Connection']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  CountryCode: CountryCode;
  CurrencyCode: CurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  Customer: ResolverTypeWrapper<Customer>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  CustomerAccountStatus: CustomerAccountStatus;
  CustomerAddress: ResolverTypeWrapper<CustomerAddress>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CustomerAddressConnection: ResolverTypeWrapper<CustomerAddressConnection>;
  CustomerAddressCreateInput: CustomerAddressCreateInput;
  CustomerAddressCreatePayload: ResolverTypeWrapper<CustomerAddressCreatePayload>;
  CustomerAddressDefaultSetInput: CustomerAddressDefaultSetInput;
  CustomerAddressDefaultSetPayload: ResolverTypeWrapper<CustomerAddressDefaultSetPayload>;
  CustomerAddressDefaultType: CustomerAddressDefaultType;
  CustomerAddressDeleteInput: CustomerAddressDeleteInput;
  CustomerAddressDeletePayload: ResolverTypeWrapper<CustomerAddressDeletePayload>;
  CustomerAddressEdge: ResolverTypeWrapper<CustomerAddressEdge>;
  CustomerAddressInput: CustomerAddressInput;
  CustomerAddressUpdateInput: CustomerAddressUpdateInput;
  CustomerAddressUpdatePayload: ResolverTypeWrapper<CustomerAddressUpdatePayload>;
  CustomerAddressValidationStatus: CustomerAddressValidationStatus;
  CustomerComparisonCategoryClearInput: CustomerComparisonCategoryClearInput;
  CustomerComparisonMutationPayload: ResolverTypeWrapper<CustomerComparisonMutationPayload>;
  CustomerComparisonVariantAddInput: CustomerComparisonVariantAddInput;
  CustomerComparisonVariantRemoveInput: CustomerComparisonVariantRemoveInput;
  CustomerDataRequest: ResolverTypeWrapper<CustomerDataRequest>;
  CustomerDataRequestCancelInput: CustomerDataRequestCancelInput;
  CustomerDataRequestCancelPayload: ResolverTypeWrapper<CustomerDataRequestCancelPayload>;
  CustomerDataRequestConnection: ResolverTypeWrapper<CustomerDataRequestConnection>;
  CustomerDataRequestCreateInput: CustomerDataRequestCreateInput;
  CustomerDataRequestCreatePayload: ResolverTypeWrapper<CustomerDataRequestCreatePayload>;
  CustomerDataRequestEdge: ResolverTypeWrapper<CustomerDataRequestEdge>;
  CustomerDataRequestStatus: CustomerDataRequestStatus;
  CustomerDataRequestType: CustomerDataRequestType;
  CustomerEmailAddress: ResolverTypeWrapper<CustomerEmailAddress>;
  CustomerMarketingConsent: ResolverTypeWrapper<CustomerMarketingConsent>;
  CustomerMarketingConsentChannel: CustomerMarketingConsentChannel;
  CustomerMarketingConsentOptInLevel: CustomerMarketingConsentOptInLevel;
  CustomerMarketingConsentState: CustomerMarketingConsentState;
  CustomerMarketingConsentTargetState: CustomerMarketingConsentTargetState;
  CustomerMarketingConsentUpdateInput: CustomerMarketingConsentUpdateInput;
  CustomerMarketingConsentUpdatePayload: ResolverTypeWrapper<CustomerMarketingConsentUpdatePayload>;
  CustomerPhoneNumber: ResolverTypeWrapper<CustomerPhoneNumber>;
  CustomerTaxExemption: ResolverTypeWrapper<CustomerTaxExemption>;
  CustomerTaxExemptionConnection: ResolverTypeWrapper<CustomerTaxExemptionConnection>;
  CustomerTaxExemptionEdge: ResolverTypeWrapper<CustomerTaxExemptionEdge>;
  CustomerTaxExemptionStatus: CustomerTaxExemptionStatus;
  CustomerTaxIdentifier: ResolverTypeWrapper<CustomerTaxIdentifier>;
  CustomerTaxIdentifierConnection: ResolverTypeWrapper<CustomerTaxIdentifierConnection>;
  CustomerTaxIdentifierCreateInput: CustomerTaxIdentifierCreateInput;
  CustomerTaxIdentifierCreatePayload: ResolverTypeWrapper<CustomerTaxIdentifierCreatePayload>;
  CustomerTaxIdentifierDeleteInput: CustomerTaxIdentifierDeleteInput;
  CustomerTaxIdentifierDeletePayload: ResolverTypeWrapper<CustomerTaxIdentifierDeletePayload>;
  CustomerTaxIdentifierEdge: ResolverTypeWrapper<CustomerTaxIdentifierEdge>;
  CustomerTaxIdentifierStatus: CustomerTaxIdentifierStatus;
  CustomerTaxIdentifierUpdateInput: CustomerTaxIdentifierUpdateInput;
  CustomerTaxIdentifierUpdatePayload: ResolverTypeWrapper<CustomerTaxIdentifierUpdatePayload>;
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: ResolverTypeWrapper<CustomerUpdatePayload>;
  CustomerUserError: ResolverTypeWrapper<CustomerUserError>;
  CustomerWishlist: ResolverTypeWrapper<CustomerWishlist>;
  CustomerWishlistConnection: ResolverTypeWrapper<CustomerWishlistConnection>;
  CustomerWishlistEdge: ResolverTypeWrapper<CustomerWishlistEdge>;
  CustomerWishlistItem: ResolverTypeWrapper<CustomerWishlistItem>;
  CustomerWishlistItemConnection: ResolverTypeWrapper<CustomerWishlistItemConnection>;
  CustomerWishlistItemEdge: ResolverTypeWrapper<CustomerWishlistItemEdge>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DimensionUnit: DimensionUnit;
  Dimensions: ResolverTypeWrapper<Dimensions>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  DisplayableError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['DisplayableError']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  GenericFile: ResolverTypeWrapper<GenericFile>;
  HTML: ResolverTypeWrapper<Scalars['HTML']['output']>;
  ISO8601DateTime: ResolverTypeWrapper<Scalars['ISO8601DateTime']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Money: ResolverTypeWrapper<Money>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Product: ResolverTypeWrapper<Product>;
  Query: ResolverTypeWrapper<{}>;
  RichText: ResolverTypeWrapper<RichText>;
  URL: ResolverTypeWrapper<Scalars['URL']['output']>;
  UnsignedInt64: ResolverTypeWrapper<Scalars['UnsignedInt64']['output']>;
  UserError: ResolverTypeWrapper<UserError>;
  Weight: ResolverTypeWrapper<Weight>;
  WeightUnit: WeightUnit;
  WishlistCreateInput: WishlistCreateInput;
  WishlistCreatePayload: ResolverTypeWrapper<WishlistCreatePayload>;
  WishlistDeleteInput: WishlistDeleteInput;
  WishlistDeletePayload: ResolverTypeWrapper<WishlistDeletePayload>;
  WishlistProductAddInput: WishlistProductAddInput;
  WishlistProductAddPayload: ResolverTypeWrapper<WishlistProductAddPayload>;
  WishlistProductRemoveInput: WishlistProductRemoveInput;
  WishlistProductRemovePayload: ResolverTypeWrapper<WishlistProductRemovePayload>;
  WishlistUpdateInput: WishlistUpdateInput;
  WishlistUpdatePayload: ResolverTypeWrapper<WishlistUpdatePayload>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Color: Scalars['Color']['output'];
  Connection: ResolversInterfaceTypes<ResolversParentTypes>['Connection'];
  Int: Scalars['Int']['output'];
  Cursor: Scalars['Cursor']['output'];
  Customer: Customer;
  ID: Scalars['ID']['output'];
  String: Scalars['String']['output'];
  CustomerAddress: CustomerAddress;
  Boolean: Scalars['Boolean']['output'];
  CustomerAddressConnection: CustomerAddressConnection;
  CustomerAddressCreateInput: CustomerAddressCreateInput;
  CustomerAddressCreatePayload: CustomerAddressCreatePayload;
  CustomerAddressDefaultSetInput: CustomerAddressDefaultSetInput;
  CustomerAddressDefaultSetPayload: CustomerAddressDefaultSetPayload;
  CustomerAddressDeleteInput: CustomerAddressDeleteInput;
  CustomerAddressDeletePayload: CustomerAddressDeletePayload;
  CustomerAddressEdge: CustomerAddressEdge;
  CustomerAddressInput: CustomerAddressInput;
  CustomerAddressUpdateInput: CustomerAddressUpdateInput;
  CustomerAddressUpdatePayload: CustomerAddressUpdatePayload;
  CustomerComparisonCategoryClearInput: CustomerComparisonCategoryClearInput;
  CustomerComparisonMutationPayload: CustomerComparisonMutationPayload;
  CustomerComparisonVariantAddInput: CustomerComparisonVariantAddInput;
  CustomerComparisonVariantRemoveInput: CustomerComparisonVariantRemoveInput;
  CustomerDataRequest: CustomerDataRequest;
  CustomerDataRequestCancelInput: CustomerDataRequestCancelInput;
  CustomerDataRequestCancelPayload: CustomerDataRequestCancelPayload;
  CustomerDataRequestConnection: CustomerDataRequestConnection;
  CustomerDataRequestCreateInput: CustomerDataRequestCreateInput;
  CustomerDataRequestCreatePayload: CustomerDataRequestCreatePayload;
  CustomerDataRequestEdge: CustomerDataRequestEdge;
  CustomerEmailAddress: CustomerEmailAddress;
  CustomerMarketingConsent: CustomerMarketingConsent;
  CustomerMarketingConsentUpdateInput: CustomerMarketingConsentUpdateInput;
  CustomerMarketingConsentUpdatePayload: CustomerMarketingConsentUpdatePayload;
  CustomerPhoneNumber: CustomerPhoneNumber;
  CustomerTaxExemption: CustomerTaxExemption;
  CustomerTaxExemptionConnection: CustomerTaxExemptionConnection;
  CustomerTaxExemptionEdge: CustomerTaxExemptionEdge;
  CustomerTaxIdentifier: CustomerTaxIdentifier;
  CustomerTaxIdentifierConnection: CustomerTaxIdentifierConnection;
  CustomerTaxIdentifierCreateInput: CustomerTaxIdentifierCreateInput;
  CustomerTaxIdentifierCreatePayload: CustomerTaxIdentifierCreatePayload;
  CustomerTaxIdentifierDeleteInput: CustomerTaxIdentifierDeleteInput;
  CustomerTaxIdentifierDeletePayload: CustomerTaxIdentifierDeletePayload;
  CustomerTaxIdentifierEdge: CustomerTaxIdentifierEdge;
  CustomerTaxIdentifierUpdateInput: CustomerTaxIdentifierUpdateInput;
  CustomerTaxIdentifierUpdatePayload: CustomerTaxIdentifierUpdatePayload;
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: CustomerUpdatePayload;
  CustomerUserError: CustomerUserError;
  CustomerWishlist: CustomerWishlist;
  CustomerWishlistConnection: CustomerWishlistConnection;
  CustomerWishlistEdge: CustomerWishlistEdge;
  CustomerWishlistItem: CustomerWishlistItem;
  CustomerWishlistItemConnection: CustomerWishlistItemConnection;
  CustomerWishlistItemEdge: CustomerWishlistItemEdge;
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  Dimensions: Dimensions;
  Float: Scalars['Float']['output'];
  DisplayableError: ResolversInterfaceTypes<ResolversParentTypes>['DisplayableError'];
  Email: Scalars['Email']['output'];
  GenericFile: GenericFile;
  HTML: Scalars['HTML']['output'];
  ISO8601DateTime: Scalars['ISO8601DateTime']['output'];
  JSON: Scalars['JSON']['output'];
  Money: Money;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Product: Product;
  Query: {};
  RichText: RichText;
  URL: Scalars['URL']['output'];
  UnsignedInt64: Scalars['UnsignedInt64']['output'];
  UserError: UserError;
  Weight: Weight;
  WishlistCreateInput: WishlistCreateInput;
  WishlistCreatePayload: WishlistCreatePayload;
  WishlistDeleteInput: WishlistDeleteInput;
  WishlistDeletePayload: WishlistDeletePayload;
  WishlistProductAddInput: WishlistProductAddInput;
  WishlistProductAddPayload: WishlistProductAddPayload;
  WishlistProductRemoveInput: WishlistProductRemoveInput;
  WishlistProductRemovePayload: WishlistProductRemovePayload;
  WishlistUpdateInput: WishlistUpdateInput;
  WishlistUpdatePayload: WishlistUpdatePayload;
}>;

export interface ColorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Color'], any> {
  name: 'Color';
}

export type ConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'CustomerAddressConnection' | 'CustomerDataRequestConnection' | 'CustomerTaxExemptionConnection' | 'CustomerTaxIdentifierConnection' | 'CustomerWishlistConnection' | 'CustomerWishlistItemConnection', ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export interface CursorScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Customer']>, { __typename: 'Customer' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  accountStatus?: Resolver<ResolversTypes['CustomerAccountStatus'], ParentType, ContextType>;
  address?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType, RequireFields<CustomerAddressArgs, 'id'>>;
  addresses?: Resolver<ResolversTypes['CustomerAddressConnection'], ParentType, ContextType, Partial<CustomerAddressesArgs>>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType, RequireFields<CustomerDataRequestArgs, 'id'>>;
  dataRequests?: Resolver<ResolversTypes['CustomerDataRequestConnection'], ParentType, ContextType, Partial<CustomerDataRequestsArgs>>;
  dateOfBirth?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  defaultBillingAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  defaultShippingAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  defaultWishlist?: Resolver<Maybe<ResolversTypes['CustomerWishlist']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emailAddress?: Resolver<Maybe<ResolversTypes['CustomerEmailAddress']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  gender?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jobTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  marketingConsents?: Resolver<Array<ResolversTypes['CustomerMarketingConsent']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['CustomerPhoneNumber']>, ParentType, ContextType>;
  preferredLocale?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prefix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  suffix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  taxExemptions?: Resolver<ResolversTypes['CustomerTaxExemptionConnection'], ParentType, ContextType, Partial<CustomerTaxExemptionsArgs>>;
  taxIdentifiers?: Resolver<ResolversTypes['CustomerTaxIdentifierConnection'], ParentType, ContextType, Partial<CustomerTaxIdentifiersArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  wishlist?: Resolver<Maybe<ResolversTypes['CustomerWishlist']>, ParentType, ContextType, RequireFields<CustomerWishlistArgs, 'id'>>;
  wishlists?: Resolver<ResolversTypes['CustomerWishlistConnection'], ParentType, ContextType, Partial<CustomerWishlistsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddress'] = ResolversParentTypes['CustomerAddress']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerAddress']>, { __typename: 'CustomerAddress' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  address1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  address2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  company?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  countryCode?: Resolver<ResolversTypes['CountryCode'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  formatted?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  formattedArea?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefaultBilling?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDefaultShipping?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  middleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  prefix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  province?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provinceCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  suffix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  validatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  validationStatus?: Resolver<ResolversTypes['CustomerAddressValidationStatus'], ParentType, ContextType>;
  zip?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressConnection'] = ResolversParentTypes['CustomerAddressConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerAddressEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressCreatePayload'] = ResolversParentTypes['CustomerAddressCreatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  customerAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressDefaultSetPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressDefaultSetPayload'] = ResolversParentTypes['CustomerAddressDefaultSetPayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressDeletePayload'] = ResolversParentTypes['CustomerAddressDeletePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  deletedAddressId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressEdge'] = ResolversParentTypes['CustomerAddressEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerAddress'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerAddressUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerAddressUpdatePayload'] = ResolversParentTypes['CustomerAddressUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  customerAddress?: Resolver<Maybe<ResolversTypes['CustomerAddress']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerComparisonMutationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerComparisonMutationPayload'] = ResolversParentTypes['CustomerComparisonMutationPayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  revision?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequest'] = ResolversParentTypes['CustomerDataRequest']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerDataRequest']>, { __typename: 'CustomerDataRequest' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  correctionDetails?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  dueAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  rejectionReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requestedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  resultFile?: Resolver<Maybe<ResolversTypes['GenericFile']>, ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['CustomerDataRequestStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CustomerDataRequestType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestCancelPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestCancelPayload'] = ResolversParentTypes['CustomerDataRequestCancelPayload']> = ResolversObject<{
  dataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestConnection'] = ResolversParentTypes['CustomerDataRequestConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerDataRequestEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestCreatePayload'] = ResolversParentTypes['CustomerDataRequestCreatePayload']> = ResolversObject<{
  dataRequest?: Resolver<Maybe<ResolversTypes['CustomerDataRequest']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDataRequestEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDataRequestEdge'] = ResolversParentTypes['CustomerDataRequestEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerDataRequest'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerEmailAddressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerEmailAddress'] = ResolversParentTypes['CustomerEmailAddress']> = ResolversObject<{
  emailAddress?: Resolver<ResolversTypes['Email'], ParentType, ContextType>;
  marketingConsent?: Resolver<Maybe<ResolversTypes['CustomerMarketingConsent']>, ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMarketingConsentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMarketingConsent'] = ResolversParentTypes['CustomerMarketingConsent']> = ResolversObject<{
  channel?: Resolver<ResolversTypes['CustomerMarketingConsentChannel'], ParentType, ContextType>;
  consentedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  optInLevel?: Resolver<ResolversTypes['CustomerMarketingConsentOptInLevel'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['CustomerMarketingConsentState'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  withdrawnAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerMarketingConsentUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerMarketingConsentUpdatePayload'] = ResolversParentTypes['CustomerMarketingConsentUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  marketingConsent?: Resolver<Maybe<ResolversTypes['CustomerMarketingConsent']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerPhoneNumberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerPhoneNumber'] = ResolversParentTypes['CustomerPhoneNumber']> = ResolversObject<{
  marketingConsent?: Resolver<Maybe<ResolversTypes['CustomerMarketingConsent']>, ParentType, ContextType>;
  phoneNumber?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemption'] = ResolversParentTypes['CustomerTaxExemption']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerTaxExemption']>, { __typename: 'CustomerTaxExemption' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  certificateFile?: Resolver<Maybe<ResolversTypes['GenericFile']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  countryCode?: Resolver<Maybe<ResolversTypes['CountryCode']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
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
  nodes?: Resolver<Array<ResolversTypes['CustomerTaxExemption']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxExemptionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxExemptionEdge'] = ResolversParentTypes['CustomerTaxExemptionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTaxExemption'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifier'] = ResolversParentTypes['CustomerTaxIdentifier']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerTaxIdentifier']>, { __typename: 'CustomerTaxIdentifier' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  countryCode?: Resolver<Maybe<ResolversTypes['CountryCode']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  identifierType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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
  nodes?: Resolver<Array<ResolversTypes['CustomerTaxIdentifier']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierCreatePayload'] = ResolversParentTypes['CustomerTaxIdentifierCreatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  taxIdentifier?: Resolver<Maybe<ResolversTypes['CustomerTaxIdentifier']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierDeletePayload'] = ResolversParentTypes['CustomerTaxIdentifierDeletePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  deletedTaxIdentifierId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierEdge'] = ResolversParentTypes['CustomerTaxIdentifierEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerTaxIdentifier'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerTaxIdentifierUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerTaxIdentifierUpdatePayload'] = ResolversParentTypes['CustomerTaxIdentifierUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  taxIdentifier?: Resolver<Maybe<ResolversTypes['CustomerTaxIdentifier']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerUpdatePayload'] = ResolversParentTypes['CustomerUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerUserError'] = ResolversParentTypes['CustomerUserError']> = ResolversObject<{
  actualRevision?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  retryable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerWishlistResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerWishlist'] = ResolversParentTypes['CustomerWishlist']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerWishlist']>, { __typename: 'CustomerWishlist' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  customer?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  items?: Resolver<ResolversTypes['CustomerWishlistItemConnection'], ParentType, ContextType, Partial<CustomerWishlistItemsArgs>>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerWishlistConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerWishlistConnection'] = ResolversParentTypes['CustomerWishlistConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerWishlistEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['CustomerWishlist']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerWishlistEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerWishlistEdge'] = ResolversParentTypes['CustomerWishlistEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerWishlist'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerWishlistItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerWishlistItem'] = ResolversParentTypes['CustomerWishlistItem']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['CustomerWishlistItem']>, { __typename: 'CustomerWishlistItem' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  addedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  wishlist?: Resolver<ResolversTypes['CustomerWishlist'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerWishlistItemConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerWishlistItemConnection'] = ResolversParentTypes['CustomerWishlistItemConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerWishlistItemEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['CustomerWishlistItem']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerWishlistItemEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerWishlistItemEdge'] = ResolversParentTypes['CustomerWishlistItemEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['Cursor'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['CustomerWishlistItem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
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
  __resolveType: TypeResolveFn<'CustomerUserError' | 'UserError', ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type GenericFileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericFile'] = ResolversParentTypes['GenericFile']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['GenericFile']>, ParentType, ContextType>;

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
  customerAddressCreate?: Resolver<ResolversTypes['CustomerAddressCreatePayload'], ParentType, ContextType, RequireFields<MutationCustomerAddressCreateArgs, 'input'>>;
  customerAddressDefaultSet?: Resolver<ResolversTypes['CustomerAddressDefaultSetPayload'], ParentType, ContextType, RequireFields<MutationCustomerAddressDefaultSetArgs, 'input'>>;
  customerAddressDelete?: Resolver<ResolversTypes['CustomerAddressDeletePayload'], ParentType, ContextType, RequireFields<MutationCustomerAddressDeleteArgs, 'input'>>;
  customerAddressUpdate?: Resolver<ResolversTypes['CustomerAddressUpdatePayload'], ParentType, ContextType, RequireFields<MutationCustomerAddressUpdateArgs, 'input'>>;
  customerComparisonCategoryClear?: Resolver<ResolversTypes['CustomerComparisonMutationPayload'], ParentType, ContextType, RequireFields<MutationCustomerComparisonCategoryClearArgs, 'input'>>;
  customerComparisonVariantAdd?: Resolver<ResolversTypes['CustomerComparisonMutationPayload'], ParentType, ContextType, RequireFields<MutationCustomerComparisonVariantAddArgs, 'input'>>;
  customerComparisonVariantRemove?: Resolver<ResolversTypes['CustomerComparisonMutationPayload'], ParentType, ContextType, RequireFields<MutationCustomerComparisonVariantRemoveArgs, 'input'>>;
  customerDataRequestCancel?: Resolver<ResolversTypes['CustomerDataRequestCancelPayload'], ParentType, ContextType, RequireFields<MutationCustomerDataRequestCancelArgs, 'input'>>;
  customerDataRequestCreate?: Resolver<ResolversTypes['CustomerDataRequestCreatePayload'], ParentType, ContextType, RequireFields<MutationCustomerDataRequestCreateArgs, 'input'>>;
  customerMarketingConsentUpdate?: Resolver<ResolversTypes['CustomerMarketingConsentUpdatePayload'], ParentType, ContextType, RequireFields<MutationCustomerMarketingConsentUpdateArgs, 'input'>>;
  customerTaxIdentifierCreate?: Resolver<ResolversTypes['CustomerTaxIdentifierCreatePayload'], ParentType, ContextType, RequireFields<MutationCustomerTaxIdentifierCreateArgs, 'input'>>;
  customerTaxIdentifierDelete?: Resolver<ResolversTypes['CustomerTaxIdentifierDeletePayload'], ParentType, ContextType, RequireFields<MutationCustomerTaxIdentifierDeleteArgs, 'input'>>;
  customerTaxIdentifierUpdate?: Resolver<ResolversTypes['CustomerTaxIdentifierUpdatePayload'], ParentType, ContextType, RequireFields<MutationCustomerTaxIdentifierUpdateArgs, 'input'>>;
  customerUpdate?: Resolver<ResolversTypes['CustomerUpdatePayload'], ParentType, ContextType, RequireFields<MutationCustomerUpdateArgs, 'input'>>;
  wishlistCreate?: Resolver<ResolversTypes['WishlistCreatePayload'], ParentType, ContextType, RequireFields<MutationWishlistCreateArgs, 'input'>>;
  wishlistDelete?: Resolver<ResolversTypes['WishlistDeletePayload'], ParentType, ContextType, RequireFields<MutationWishlistDeleteArgs, 'input'>>;
  wishlistProductAdd?: Resolver<ResolversTypes['WishlistProductAddPayload'], ParentType, ContextType, RequireFields<MutationWishlistProductAddArgs, 'input'>>;
  wishlistProductRemove?: Resolver<ResolversTypes['WishlistProductRemovePayload'], ParentType, ContextType, RequireFields<MutationWishlistProductRemoveArgs, 'input'>>;
  wishlistUpdate?: Resolver<ResolversTypes['WishlistUpdatePayload'], ParentType, ContextType, RequireFields<MutationWishlistUpdateArgs, 'input'>>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'CustomerAddress' | 'CustomerDataRequest' | 'CustomerTaxExemption' | 'CustomerTaxIdentifier' | 'CustomerWishlist' | 'CustomerWishlistItem', ParentType, ContextType>;
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
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
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

export type WishlistCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WishlistCreatePayload'] = ResolversParentTypes['WishlistCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  wishlist?: Resolver<Maybe<ResolversTypes['CustomerWishlist']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WishlistDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WishlistDeletePayload'] = ResolversParentTypes['WishlistDeletePayload']> = ResolversObject<{
  deletedWishlistId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WishlistProductAddPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WishlistProductAddPayload'] = ResolversParentTypes['WishlistProductAddPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  wishlistItem?: Resolver<Maybe<ResolversTypes['CustomerWishlistItem']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WishlistProductRemovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WishlistProductRemovePayload'] = ResolversParentTypes['WishlistProductRemovePayload']> = ResolversObject<{
  deletedWishlistItemId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WishlistUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WishlistUpdatePayload'] = ResolversParentTypes['WishlistUpdatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['CustomerUserError']>, ParentType, ContextType>;
  wishlist?: Resolver<Maybe<ResolversTypes['CustomerWishlist']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  Color?: GraphQLScalarType;
  Connection?: ConnectionResolvers<ContextType>;
  Cursor?: GraphQLScalarType;
  Customer?: CustomerResolvers<ContextType>;
  CustomerAddress?: CustomerAddressResolvers<ContextType>;
  CustomerAddressConnection?: CustomerAddressConnectionResolvers<ContextType>;
  CustomerAddressCreatePayload?: CustomerAddressCreatePayloadResolvers<ContextType>;
  CustomerAddressDefaultSetPayload?: CustomerAddressDefaultSetPayloadResolvers<ContextType>;
  CustomerAddressDeletePayload?: CustomerAddressDeletePayloadResolvers<ContextType>;
  CustomerAddressEdge?: CustomerAddressEdgeResolvers<ContextType>;
  CustomerAddressUpdatePayload?: CustomerAddressUpdatePayloadResolvers<ContextType>;
  CustomerComparisonMutationPayload?: CustomerComparisonMutationPayloadResolvers<ContextType>;
  CustomerDataRequest?: CustomerDataRequestResolvers<ContextType>;
  CustomerDataRequestCancelPayload?: CustomerDataRequestCancelPayloadResolvers<ContextType>;
  CustomerDataRequestConnection?: CustomerDataRequestConnectionResolvers<ContextType>;
  CustomerDataRequestCreatePayload?: CustomerDataRequestCreatePayloadResolvers<ContextType>;
  CustomerDataRequestEdge?: CustomerDataRequestEdgeResolvers<ContextType>;
  CustomerEmailAddress?: CustomerEmailAddressResolvers<ContextType>;
  CustomerMarketingConsent?: CustomerMarketingConsentResolvers<ContextType>;
  CustomerMarketingConsentUpdatePayload?: CustomerMarketingConsentUpdatePayloadResolvers<ContextType>;
  CustomerPhoneNumber?: CustomerPhoneNumberResolvers<ContextType>;
  CustomerTaxExemption?: CustomerTaxExemptionResolvers<ContextType>;
  CustomerTaxExemptionConnection?: CustomerTaxExemptionConnectionResolvers<ContextType>;
  CustomerTaxExemptionEdge?: CustomerTaxExemptionEdgeResolvers<ContextType>;
  CustomerTaxIdentifier?: CustomerTaxIdentifierResolvers<ContextType>;
  CustomerTaxIdentifierConnection?: CustomerTaxIdentifierConnectionResolvers<ContextType>;
  CustomerTaxIdentifierCreatePayload?: CustomerTaxIdentifierCreatePayloadResolvers<ContextType>;
  CustomerTaxIdentifierDeletePayload?: CustomerTaxIdentifierDeletePayloadResolvers<ContextType>;
  CustomerTaxIdentifierEdge?: CustomerTaxIdentifierEdgeResolvers<ContextType>;
  CustomerTaxIdentifierUpdatePayload?: CustomerTaxIdentifierUpdatePayloadResolvers<ContextType>;
  CustomerUpdatePayload?: CustomerUpdatePayloadResolvers<ContextType>;
  CustomerUserError?: CustomerUserErrorResolvers<ContextType>;
  CustomerWishlist?: CustomerWishlistResolvers<ContextType>;
  CustomerWishlistConnection?: CustomerWishlistConnectionResolvers<ContextType>;
  CustomerWishlistEdge?: CustomerWishlistEdgeResolvers<ContextType>;
  CustomerWishlistItem?: CustomerWishlistItemResolvers<ContextType>;
  CustomerWishlistItemConnection?: CustomerWishlistItemConnectionResolvers<ContextType>;
  CustomerWishlistItemEdge?: CustomerWishlistItemEdgeResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  Decimal?: GraphQLScalarType;
  Dimensions?: DimensionsResolvers<ContextType>;
  DisplayableError?: DisplayableErrorResolvers<ContextType>;
  Email?: GraphQLScalarType;
  GenericFile?: GenericFileResolvers<ContextType>;
  HTML?: GraphQLScalarType;
  ISO8601DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Money?: MoneyResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RichText?: RichTextResolvers<ContextType>;
  URL?: GraphQLScalarType;
  UnsignedInt64?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
  Weight?: WeightResolvers<ContextType>;
  WishlistCreatePayload?: WishlistCreatePayloadResolvers<ContextType>;
  WishlistDeletePayload?: WishlistDeletePayloadResolvers<ContextType>;
  WishlistProductAddPayload?: WishlistProductAddPayloadResolvers<ContextType>;
  WishlistProductRemovePayload?: WishlistProductRemovePayloadResolvers<ContextType>;
  WishlistUpdatePayload?: WishlistUpdatePayloadResolvers<ContextType>;
}>;

