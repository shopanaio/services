import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '@src/interfaces/gql-storefront-api/context.js';
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
  BigInt: { input: number; output: number; }
  Cursor: { input: any; output: any; }
  DateTime: { input: string; output: string; }
  /** Decimal represented as integer amount and scale internally; serialized as normalized string */
  Decimal: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: unknown; output: unknown; }
  _Any: { input: any; output: any; }
  federation__FieldSet: { input: any; output: any; }
  federation__Policy: { input: any; output: any; }
  federation__Scope: { input: any; output: any; }
  link__Import: { input: any; output: any; }
};

export type ApiCountryCode =
  /** Andorra */
  | 'AD'
  /** United Arab Emirates */
  | 'AE'
  /** Afghanistan */
  | 'AF'
  /** Antigua and Barbuda */
  | 'AG'
  /** Albania */
  | 'AL'
  /** Armenia */
  | 'AM'
  /** Angola */
  | 'AO'
  /** Argentina */
  | 'AR'
  /** Austria */
  | 'AT'
  /** Australia */
  | 'AU'
  /** Aruba */
  | 'AW'
  /** Åland Islands */
  | 'AX'
  /** Azerbaijan */
  | 'AZ'
  /** Bosnia and Herzegovina */
  | 'BA'
  /** Barbados */
  | 'BB'
  /** Bangladesh */
  | 'BD'
  /** Belgium */
  | 'BE'
  /** Burkina Faso */
  | 'BF'
  /** Bulgaria */
  | 'BG'
  /** Bahrain */
  | 'BH'
  /** Burundi */
  | 'BI'
  /** Benin */
  | 'BJ'
  /** Bermuda */
  | 'BM'
  /** Brunei */
  | 'BN'
  /** Bolivia */
  | 'BO'
  /** Brazil */
  | 'BR'
  /** Bahamas */
  | 'BS'
  /** Bhutan */
  | 'BT'
  /** Botswana */
  | 'BW'
  /** Belarus */
  | 'BY'
  /** Belize */
  | 'BZ'
  /** Canada */
  | 'CA'
  /** Democratic Republic of the Congo */
  | 'CD'
  /** Central African Republic */
  | 'CF'
  /** Republic of the Congo */
  | 'CG'
  /** Switzerland */
  | 'CH'
  /** Ivory Coast */
  | 'CI'
  /** Chile */
  | 'CL'
  /** Cameroon */
  | 'CM'
  /** China */
  | 'CN'
  /** Colombia */
  | 'CO'
  /** Costa Rica */
  | 'CR'
  /** Cuba */
  | 'CU'
  /** Cape Verde */
  | 'CV'
  /** Curaçao */
  | 'CW'
  /** Cyprus */
  | 'CY'
  /** Czech Republic */
  | 'CZ'
  /** Germany */
  | 'DE'
  /** Djibouti */
  | 'DJ'
  /** Denmark */
  | 'DK'
  /** Dominica */
  | 'DM'
  /** Dominican Republic */
  | 'DO'
  /** Algeria */
  | 'DZ'
  /** Ecuador */
  | 'EC'
  /** Estonia */
  | 'EE'
  /** Egypt */
  | 'EG'
  /** Western Sahara */
  | 'EH'
  /** Eritrea */
  | 'ER'
  /** Spain */
  | 'ES'
  /** Ethiopia */
  | 'ET'
  /** Finland */
  | 'FI'
  /** Fiji */
  | 'FJ'
  /** Micronesia */
  | 'FM'
  /** Faroe Islands */
  | 'FO'
  /** France */
  | 'FR'
  /** Gabon */
  | 'GA'
  /** United Kingdom */
  | 'GB'
  /** Grenada */
  | 'GD'
  /** Georgia */
  | 'GE'
  /** Guernsey */
  | 'GG'
  /** Ghana */
  | 'GH'
  /** Greenland */
  | 'GL'
  /** Gambia */
  | 'GM'
  /** Guinea */
  | 'GN'
  /** Equatorial Guinea */
  | 'GQ'
  /** Greece */
  | 'GR'
  /** Guatemala */
  | 'GT'
  /** Guinea-Bissau */
  | 'GW'
  /** Guyana */
  | 'GY'
  /** Honduras */
  | 'HN'
  /** Croatia */
  | 'HR'
  /** Haiti */
  | 'HT'
  /** Hungary */
  | 'HU'
  /** Indonesia */
  | 'ID'
  /** Ireland */
  | 'IE'
  /** Israel */
  | 'IL'
  /** Isle of Man */
  | 'IM'
  /** India */
  | 'IN'
  /** Iraq */
  | 'IQ'
  /** Iran */
  | 'IR'
  /** Iceland */
  | 'IS'
  /** Italy */
  | 'IT'
  /** Jersey */
  | 'JE'
  /** Jamaica */
  | 'JM'
  /** Jordan */
  | 'JO'
  /** Japan */
  | 'JP'
  /** Kenya */
  | 'KE'
  /** Kyrgyzstan */
  | 'KG'
  /** Cambodia */
  | 'KH'
  /** Comoros */
  | 'KM'
  /** Saint Kitts and Nevis */
  | 'KN'
  /** North Korea */
  | 'KP'
  /** South Korea */
  | 'KR'
  /** Kuwait */
  | 'KW'
  /** Kazakhstan */
  | 'KZ'
  /** Laos */
  | 'LA'
  /** Lebanon */
  | 'LB'
  /** Saint Lucia */
  | 'LC'
  /** Liechtenstein */
  | 'LI'
  /** Sri Lanka */
  | 'LK'
  /** Liberia */
  | 'LR'
  /** Lesotho */
  | 'LS'
  /** Lithuania */
  | 'LT'
  /** Luxembourg */
  | 'LU'
  /** Latvia */
  | 'LV'
  /** Morocco */
  | 'MA'
  /** Monaco */
  | 'MC'
  /** Moldova */
  | 'MD'
  /** Montenegro */
  | 'ME'
  /** Madagascar */
  | 'MG'
  /** Marshall Islands */
  | 'MH'
  /** North Macedonia */
  | 'MK'
  /** Mali */
  | 'ML'
  /** Myanmar */
  | 'MM'
  /** Mongolia */
  | 'MN'
  /** Mauritania */
  | 'MR'
  /** Malta */
  | 'MT'
  /** Mauritius */
  | 'MU'
  /** Maldives */
  | 'MV'
  /** Malawi */
  | 'MW'
  /** Mexico */
  | 'MX'
  /** Malaysia */
  | 'MY'
  /** Mozambique */
  | 'MZ'
  /** Namibia */
  | 'NA'
  /** New Caledonia */
  | 'NC'
  /** Niger */
  | 'NE'
  /** Nigeria */
  | 'NG'
  /** Nicaragua */
  | 'NI'
  /** Netherlands */
  | 'NL'
  /** Norway */
  | 'NO'
  /** Nepal */
  | 'NP'
  /** New Zealand */
  | 'NZ'
  /** Oman */
  | 'OM'
  /** Panama */
  | 'PA'
  /** Peru */
  | 'PE'
  /** Papua New Guinea */
  | 'PG'
  /** Philippines */
  | 'PH'
  /** Pakistan */
  | 'PK'
  /** Poland */
  | 'PL'
  /** Palestine */
  | 'PS'
  /** Portugal */
  | 'PT'
  /** Palau */
  | 'PW'
  /** Paraguay */
  | 'PY'
  /** Qatar */
  | 'QA'
  /** Romania */
  | 'RO'
  /** Serbia */
  | 'RS'
  /** Russia */
  | 'RU'
  /** Rwanda */
  | 'RW'
  /** Saudi Arabia */
  | 'SA'
  /** Solomon Islands */
  | 'SB'
  /** Seychelles */
  | 'SC'
  /** Sudan */
  | 'SD'
  /** Sweden */
  | 'SE'
  /** Singapore */
  | 'SG'
  /** Slovenia */
  | 'SI'
  /** Slovakia */
  | 'SK'
  /** Sierra Leone */
  | 'SL'
  /** San Marino */
  | 'SM'
  /** Senegal */
  | 'SN'
  /** Suriname */
  | 'SR'
  /** South Sudan */
  | 'SS'
  /** El Salvador */
  | 'SV'
  /** Syria */
  | 'SY'
  /** Swaziland (Eswatini) */
  | 'SZ'
  /** Chad */
  | 'TD'
  /** Togo */
  | 'TG'
  /** Thailand */
  | 'TH'
  /** Tajikistan */
  | 'TJ'
  /** Timor-Leste (East Timor) */
  | 'TL'
  /** Turkmenistan */
  | 'TM'
  /** Tunisia */
  | 'TN'
  /** Tonga */
  | 'TO'
  /** Turkey */
  | 'TR'
  /** Trinidad and Tobago */
  | 'TT'
  /** Tanzania */
  | 'TZ'
  /** Ukraine */
  | 'UA'
  /** Uganda */
  | 'UG'
  /** United States */
  | 'US'
  /** Uruguay */
  | 'UY'
  /** Uzbekistan */
  | 'UZ'
  /** Vatican City */
  | 'VA'
  /** Saint Vincent and the Grenadines */
  | 'VC'
  /** Venezuela */
  | 'VE'
  /** British Virgin Islands */
  | 'VG'
  /** US Virgin Islands */
  | 'VI'
  /** Vietnam */
  | 'VN'
  /** Vanuatu */
  | 'VU'
  /** Samoa */
  | 'WS'
  /** Kosovo */
  | 'XK'
  /** Yemen */
  | 'YE'
  /** South Africa */
  | 'ZA'
  /** Zambia */
  | 'ZM'
  /** Zimbabwe */
  | 'ZW';

export type ApiCreateOrderInput = {
  /** ID of the checkout. */
  checkoutId: Scalars['ID']['input'];
};

/** Currency codes according to ISO 4217 */
export type ApiCurrencyCode =
  /** 2 decimals — UAE Dirham (United Arab Emirates) */
  | 'AED'
  /** 2 decimals — Afghan Afghani (Afghanistan) */
  | 'AFN'
  /** 2 decimals — Albanian Lek (Albania) */
  | 'ALL'
  /** 2 decimals — Armenian Dram (Armenia) */
  | 'AMD'
  /** 2 decimals — Netherlands Antillean Guilder (Netherlands Antilles) */
  | 'ANG'
  /** 2 decimals — Angolan Kwanza (Angola) */
  | 'AOA'
  /** 2 decimals — Argentine Peso (Argentina) */
  | 'ARS'
  /** 2 decimals — Australian Dollar (Australia) */
  | 'AUD'
  /** 2 decimals — Aruban Florin (Aruba) */
  | 'AWG'
  /** 2 decimals — Azerbaijani Manat (Azerbaijan) */
  | 'AZN'
  /** 2 decimals — Bosnia-Herzegovina Convertible Mark (Bosnia and Herzegovina) */
  | 'BAM'
  /** 2 decimals — Barbadian Dollar (Barbados) */
  | 'BBD'
  /** 2 decimals — Bangladeshi Taka (Bangladesh) */
  | 'BDT'
  /** 2 decimals — Bulgarian Lev (Bulgaria) */
  | 'BGN'
  /** 3 decimals — Bahraini Dinar (Bahrain) */
  | 'BHD'
  /** 0 decimals — Burundian Franc (Burundi) */
  | 'BIF'
  /** 2 decimals — Bermudian Dollar (Bermuda) */
  | 'BMD'
  /** 2 decimals — Brunei Dollar (Brunei) */
  | 'BND'
  /** 2 decimals — Bolivian Boliviano (Bolivia) */
  | 'BOB'
  /** 2 decimals — Brazilian Real (Brazil) */
  | 'BRL'
  /** 2 decimals — Bahamian Dollar (Bahamas) */
  | 'BSD'
  /** 2 decimals — Bhutanese Ngultrum (Bhutan) */
  | 'BTN'
  /** 2 decimals — Botswana Pula (Botswana) */
  | 'BWP'
  /** 2 decimals — Belarusian Ruble (Belarus) */
  | 'BYN'
  /** 2 decimals — Belize Dollar (Belize) */
  | 'BZD'
  /** 2 decimals — Canadian Dollar (Canada) */
  | 'CAD'
  /** 2 decimals — Congolese Franc (Democratic Republic of the Congo) */
  | 'CDF'
  /** 2 decimals — Swiss Franc (Switzerland) */
  | 'CHF'
  /** 0 decimals — Chilean Peso (Chile) */
  | 'CLP'
  /** 2 decimals — Chinese Yuan (China) */
  | 'CNY'
  /** 2 decimals — Colombian Peso (Colombia) */
  | 'COP'
  /** 2 decimals — Costa Rican Colon (Costa Rica) */
  | 'CRC'
  /** 2 decimals — Cuban Peso (Cuba) */
  | 'CUP'
  /** 2 decimals — Cape Verdean Escudo (Cape Verde) */
  | 'CVE'
  /** 2 decimals — Czech Koruna (Czech Republic) */
  | 'CZK'
  /** 0 decimals — Djiboutian Franc (Djibouti) */
  | 'DJF'
  /** 2 decimals — Danish Krone (Denmark) */
  | 'DKK'
  /** 2 decimals — Dominican Peso (Dominican Republic) */
  | 'DOP'
  /** 2 decimals — Algerian Dinar (Algeria) */
  | 'DZD'
  /** 2 decimals — Egyptian Pound (Egypt) */
  | 'EGP'
  /** 2 decimals — Eritrean Nakfa (Eritrea) */
  | 'ERN'
  /** 2 decimals — Ethiopian Birr (Ethiopia) */
  | 'ETB'
  /** 2 decimals — Euro (European Union) */
  | 'EUR'
  /** 2 decimals — Fijian Dollar (Fiji) */
  | 'FJD'
  /** 2 decimals — Falkland Islands Pound (Falkland Islands) */
  | 'FKP'
  /** 2 decimals — Faroese Króna (Faroe Islands) */
  | 'FOK'
  /** 2 decimals — Pound Sterling (United Kingdom) */
  | 'GBP'
  /** 2 decimals — Georgian Lari (Georgia) */
  | 'GEL'
  /** 2 decimals — Guernsey Pound (Guernsey) */
  | 'GGP'
  /** 2 decimals — Ghanaian Cedi (Ghana) */
  | 'GHS'
  /** 2 decimals — Gibraltar Pound (Gibraltar) */
  | 'GIP'
  /** 2 decimals — Gambian Dalasi (Gambia) */
  | 'GMD'
  /** 0 decimals — Guinean Franc (Guinea) */
  | 'GNF'
  /** 2 decimals — Guatemalan Quetzal (Guatemala) */
  | 'GTQ'
  /** 2 decimals — Guyanese Dollar (Guyana) */
  | 'GYD'
  /** 2 decimals — Hong Kong Dollar (Hong Kong) */
  | 'HKD'
  /** 2 decimals — Honduran Lempira (Honduras) */
  | 'HNL'
  /** 2 decimals — Croatian Kuna (Croatia) */
  | 'HRK'
  /** 2 decimals — Haitian Gourde (Haiti) */
  | 'HTG'
  /** 2 decimals — Hungarian Forint (Hungary) */
  | 'HUF'
  /** 0 decimals — Indonesian Rupiah (Indonesia) */
  | 'IDR'
  /** 2 decimals — Israeli New Shekel (Israel) */
  | 'ILS'
  /** 2 decimals — Isle of Man Pound (Isle of Man) */
  | 'IMP'
  /** 2 decimals — Indian Rupee (India) */
  | 'INR'
  /** 3 decimals — Iraqi Dinar (Iraq) */
  | 'IQD'
  /** 2 decimals — Iranian Rial (Iran) */
  | 'IRR'
  /** 0 decimals — Icelandic Króna (Iceland) */
  | 'ISK'
  /** 2 decimals — Jersey Pound (Jersey) */
  | 'JEP'
  /** 2 decimals — Jamaican Dollar (Jamaica) */
  | 'JMD'
  /** 3 decimals — Jordanian Dinar (Jordan) */
  | 'JOD'
  /** 0 decimals — Japanese Yen (Japan) */
  | 'JPY'
  /** 2 decimals — Kenyan Shilling (Kenya) */
  | 'KES'
  /** 2 decimals — Kyrgyzstani Som (Kyrgyzstan) */
  | 'KGS'
  /** 2 decimals — Cambodian Riel (Cambodia) */
  | 'KHR'
  /** 2 decimals — Comorian Franc (Comoros) */
  | 'KMF'
  /** 2 decimals — North Korean Won (North Korea) */
  | 'KPW'
  /** 2 decimals — South Korean Won (South Korea) */
  | 'KRW'
  /** 3 decimals — Kuwaiti Dinar (Kuwait) */
  | 'KWD'
  /** 2 decimals — Cayman Islands Dollar (Cayman Islands) */
  | 'KYD'
  /** 2 decimals — Kazakhstani Tenge (Kazakhstan) */
  | 'KZT'
  /** 2 decimals — Lao Kip (Laos) */
  | 'LAK'
  /** 2 decimals — Lebanese Pound (Lebanon) */
  | 'LBP'
  /** 2 decimals — Sri Lankan Rupee (Sri Lanka) */
  | 'LKR'
  /** 3 decimals — Liberian Dollar (Liberia) */
  | 'LRD'
  /** 3 decimals — Libyan Dinar (Libya) */
  | 'LYD'
  /** 2 decimals — Moroccan Dirham (Morocco) */
  | 'MAD'
  /** 2 decimals — Moldovan Leu (Moldova) */
  | 'MDL'
  /** 2 decimals — Malagasy Ariary (Madagascar) */
  | 'MGA'
  /** 2 decimals — Macedonian Denar (North Macedonia) */
  | 'MKD'
  /** 2 decimals — Burmese Kyat (Myanmar) */
  | 'MMK'
  /** 2 decimals — Mongolian Tögrög (Mongolia) */
  | 'MNT'
  /** 2 decimals — Macanese Pataca (Macau) */
  | 'MOP'
  /** 2 decimals — Mauritanian Ouguiya (Mauritania) */
  | 'MRU'
  /** 2 decimals — Mauritian Rupee (Mauritius) */
  | 'MUR'
  /** 2 decimals — Maldivian Rufiyaa (Maldives) */
  | 'MVR'
  /** 2 decimals — Malawian Kwacha (Malawi) */
  | 'MWK'
  /** 2 decimals — Mexican Peso (Mexico) */
  | 'MXN'
  /** 2 decimals — Malaysian Ringgit (Malaysia) */
  | 'MYR'
  /** 2 decimals — Mozambican Metical (Mozambique) */
  | 'MZN'
  /** 2 decimals — Namibian Dollar (Namibia) */
  | 'NAD'
  /** 2 decimals — Nigerian Naira (Nigeria) */
  | 'NGN'
  /** 2 decimals — Nicaraguan Córdoba (Nicaragua) */
  | 'NIO'
  /** 2 decimals — Norwegian Krone (Norway) */
  | 'NOK'
  /** 2 decimals — Nepalese Rupee (Nepal) */
  | 'NPR'
  /** 2 decimals — New Zealand Dollar (New Zealand) */
  | 'NZD'
  /** 2 decimals — Omani Rial (Oman) */
  | 'OMR'
  /** 2 decimals — Panamanian Balboa (Panama) */
  | 'PAB'
  /** 2 decimals — Peruvian Sol (Peru) */
  | 'PEN'
  /** 0 decimals — Papua New Guinean Kina (Papua New Guinea) */
  | 'PGK'
  /** 2 decimals — Philippine Peso (Philippines) */
  | 'PHP'
  /** 2 decimals — Pakistani Rupee (Pakistan) */
  | 'PKR'
  /** 0 decimals — Polish Zloty (Poland) */
  | 'PLN'
  /** 2 decimals — Paraguayan Guaraní (Paraguay) */
  | 'PYG'
  /** 2 decimals — Qatari Riyal (Qatar) */
  | 'QAR'
  /** 2 decimals — Romanian Leu (Romania) */
  | 'RON'
  /** 2 decimals — Serbian Dinar (Serbia) */
  | 'RSD'
  /** 2 decimals — Russian Ruble (Russia) */
  | 'RUB'
  /** 2 decimals — Rwandan Franc (Rwanda) */
  | 'RWF'
  /** 2 decimals — Saudi Riyal (Saudi Arabia) */
  | 'SAR'
  /** 2 decimals — Solomon Islands Dollar (Solomon Islands) */
  | 'SBD'
  /** 2 decimals — Seychelles Rupee (Seychelles) */
  | 'SCR'
  /** 2 decimals — Sudanese Pound (Sudan) */
  | 'SDG'
  /** 2 decimals — Swedish Krona (Sweden) */
  | 'SEK'
  /** 2 decimals — Singapore Dollar (Singapore) */
  | 'SGD'
  /** 0 decimals — Saint Helena Pound (Saint Helena) */
  | 'SHP'
  /** 2 decimals — Sierra Leonean Leone (Sierra Leone) */
  | 'SLE'
  /** 2 decimals — Somali Shilling (Somalia) */
  | 'SOS'
  /** 2 decimals — Surinamese Dollar (Suriname) */
  | 'SRD'
  /** 2 decimals — South Sudanese Pound (South Sudan) */
  | 'SSP'
  /** 2 decimals — São Tomé and Príncipe Dobra (São Tomé and Príncipe) */
  | 'STN'
  /** 2 decimals — Salvadoran Colón (El Salvador) */
  | 'SVC'
  /** 2 decimals — Syrian Pound (Syria) */
  | 'SYP'
  /** 2 decimals — Eswatini Lilangeni (Eswatini) */
  | 'SZL'
  /** 2 decimals — Thai Baht (Thailand) */
  | 'THB'
  /** 2 decimals — Tajikistani Somoni (Tajikistan) */
  | 'TJS'
  /** 2 decimals — Turkmenistani Manat (Turkmenistan) */
  | 'TMT'
  /** 2 decimals — Tunisian Dinar (Tunisia) */
  | 'TND'
  /** 2 decimals — Tongan Paʻanga (Tonga) */
  | 'TOP'
  /** 2 decimals — Turkish Lira (Türkiye) */
  | 'TRY'
  /** 2 decimals — Trinidad and Tobago Dollar (Trinidad and Tobago) */
  | 'TTD'
  /** 2 decimals — New Taiwan Dollar (Taiwan) */
  | 'TWD'
  /** 0 decimals — Tanzanian Shilling (Tanzania) */
  | 'TZS'
  /** 2 decimals — Ukrainian Hryvnia (Ukraine) */
  | 'UAH'
  /** 2 decimals — Ugandan Shilling (Uganda) */
  | 'UGX'
  /** 2 decimals — United States Dollar (United States) */
  | 'USD'
  /** 2 decimals — Uruguayan Peso (Uruguay) */
  | 'UYU'
  /** 2 decimals — Uzbekistan Som (Uzbekistan) */
  | 'UZS'
  /** 2 decimals — Venezuelan Bolívar (Venezuela) */
  | 'VES'
  /** 0 decimals — Vietnamese Dong (Vietnam) */
  | 'VND'
  /** 2 decimals — Vanuatu Vatu (Vanuatu) */
  | 'VUV'
  /** 2 decimals — Samoan Tala (Samoa) */
  | 'WST'
  /** 2 decimals — Central African CFA Franc (CEMAC) */
  | 'XAF'
  /** 0 decimals — East Caribbean Dollar (OECS) */
  | 'XCD'
  /** 0 decimals — Special Drawing Rights (IMF) */
  | 'XDR'
  /** 0 decimals — West African CFA Franc (UEMOA) */
  | 'XOF'
  /** 0 decimals — CFP Franc (French overseas territories) */
  | 'XPF'
  /** 2 decimals — Yemeni Rial (Yemen) */
  | 'YER'
  /** 2 decimals — South African Rand (South Africa) */
  | 'ZAR'
  /** 2 decimals — Zambian Kwacha (Zambia) */
  | 'ZMW'
  /** 2 decimals — Zimbabwean Dollar (Zimbabwe) */
  | 'ZWL';

export type ApiMoney = {
  __typename?: 'Money';
  /** The amount of money */
  amount: Scalars['Decimal']['output'];
  /** The currency code */
  currencyCode: ApiCurrencyCode;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  orderMutation: ApiOrderMutation;
};

export type ApiNode = {
  id: Scalars['ID']['output'];
};

export type ApiOrder = {
  __typename?: 'Order';
  /** Cost breakdown for the order. */
  cost: ApiOrderCost;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Order items. */
  lines: Array<ApiOrderLine>;
  /** A unique numeric identifier for the order for use by shop owner and customer. */
  number: Scalars['BigInt']['output'];
  /** Order status. */
  status: ApiOrderStatus;
};

export type ApiOrderCost = {
  __typename?: 'OrderCost';
  /** Total value of items before any discounts. */
  subtotalAmount: ApiMoney;
  /** Final amount to be paid, including item cost, shipping, and taxes. */
  totalAmount: ApiMoney;
  /** Total discount from both item-level and checkout-level promotions. */
  totalDiscountAmount: ApiMoney;
  /** Total shipping cost (only MERCHANT_COLLECTED payments). */
  totalShippingAmount: ApiMoney;
  /** Total tax amount applied to the checkout. */
  totalTaxAmount: ApiMoney;
};

export type ApiOrderLine = {
  __typename?: 'OrderLine';
  /** Cost breakdown for the order line. */
  cost: ApiOrderLineCost;
  /** Creation date. */
  createdAt: Scalars['DateTime']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Purchasable unit. */
  purchasable: ApiPurchasable;
  /** ID of the purchasable. */
  purchasableId: Scalars['ID']['output'];
  /** Quantity of the item being purchased. */
  quantity: Scalars['Int']['output'];
  /** Last updated date. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderLineCost = {
  __typename?: 'OrderLineCost';
  /** Discount amount applied to a line. */
  discountAmount: ApiMoney;
  /** Total cost of all units before discounts. */
  subtotalAmount: ApiMoney;
  /** Total tax amount applied to the checkout line. */
  taxAmount: ApiMoney;
  /** Total cost of this line (all units), after discounts and taxes. */
  totalAmount: ApiMoney;
  /** The original list price per unit before any discounts. */
  unitCompareAtPrice: ApiMoney;
  /** The current price per unit before discounts are applied (may differ from compareAt price if on sale). */
  unitPrice: ApiMoney;
};

export type ApiOrderMutation = {
  __typename?: 'OrderMutation';
  orderCreate: ApiOrder;
};


export type ApiOrderMutationOrderCreateArgs = {
  input: ApiCreateOrderInput;
};

export type ApiOrderStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'CLOSED';

export type ApiPurchasable = ApiPurchasableSnapshot;

export type ApiPurchasableSnapshot = {
  __typename?: 'PurchasableSnapshot';
  snapshot: Scalars['JSON']['output'];
};

export type ApiQuery = {
  __typename?: 'Query';
  _entities: Array<Maybe<Api_Entity>>;
  _service: Api_Service;
};


export type ApiQuery_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};

export type ApiUser = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  /** List of the user's orders. */
  orders: Array<ApiOrder>;
};

export type Api_Entity = ApiUser;

export type Api_Service = {
  __typename?: '_Service';
  sdl: Maybe<Scalars['String']['output']>;
};

export type ApiLink__Purpose =
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  | 'EXECUTION'
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  | 'SECURITY';



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

/** Mapping of union types */
export type ApiResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  Purchasable: ( ApiPurchasableSnapshot );
  _Entity: ( Omit<ApiUser, 'orders'> & { orders: Array<_RefType['Order']> } );
};

/** Mapping of interface types */
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Node: never;
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CountryCode: ApiCountryCode;
  CreateOrderInput: ApiCreateOrderInput;
  CurrencyCode: ApiCurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Money: ResolverTypeWrapper<ApiMoney>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Node']>;
  Order: ResolverTypeWrapper<Omit<ApiOrder, 'lines'> & { lines: Array<ApiResolversTypes['OrderLine']> }>;
  OrderCost: ResolverTypeWrapper<ApiOrderCost>;
  OrderLine: ResolverTypeWrapper<Omit<ApiOrderLine, 'cost' | 'purchasable'> & { cost: ApiResolversTypes['OrderLineCost'], purchasable: ApiResolversTypes['Purchasable'] }>;
  OrderLineCost: ResolverTypeWrapper<ApiOrderLineCost>;
  OrderMutation: ResolverTypeWrapper<Omit<ApiOrderMutation, 'orderCreate'> & { orderCreate: ApiResolversTypes['Order'] }>;
  OrderStatus: ApiOrderStatus;
  Purchasable: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>['Purchasable']>;
  PurchasableSnapshot: ResolverTypeWrapper<ApiPurchasableSnapshot>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<Omit<ApiUser, 'orders'> & { orders: Array<ApiResolversTypes['Order']> }>;
  _Any: ResolverTypeWrapper<Scalars['_Any']['output']>;
  _Entity: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>['_Entity']>;
  _Service: ResolverTypeWrapper<Api_Service>;
  federation__FieldSet: ResolverTypeWrapper<Scalars['federation__FieldSet']['output']>;
  federation__Policy: ResolverTypeWrapper<Scalars['federation__Policy']['output']>;
  federation__Scope: ResolverTypeWrapper<Scalars['federation__Scope']['output']>;
  link__Import: ResolverTypeWrapper<Scalars['link__Import']['output']>;
  link__Purpose: ApiLink__Purpose;
};

/** Mapping between all available schema types and the resolvers parents */
export type ApiResolversParentTypes = {
  BigInt: Scalars['BigInt']['output'];
  Boolean: Scalars['Boolean']['output'];
  CreateOrderInput: ApiCreateOrderInput;
  Cursor: Scalars['Cursor']['output'];
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  Email: Scalars['Email']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Money: ApiMoney;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Node'];
  Order: Omit<ApiOrder, 'lines'> & { lines: Array<ApiResolversParentTypes['OrderLine']> };
  OrderCost: ApiOrderCost;
  OrderLine: Omit<ApiOrderLine, 'cost' | 'purchasable'> & { cost: ApiResolversParentTypes['OrderLineCost'], purchasable: ApiResolversParentTypes['Purchasable'] };
  OrderLineCost: ApiOrderLineCost;
  OrderMutation: Omit<ApiOrderMutation, 'orderCreate'> & { orderCreate: ApiResolversParentTypes['Order'] };
  Purchasable: ApiResolversUnionTypes<ApiResolversParentTypes>['Purchasable'];
  PurchasableSnapshot: ApiPurchasableSnapshot;
  Query: {};
  String: Scalars['String']['output'];
  User: Omit<ApiUser, 'orders'> & { orders: Array<ApiResolversParentTypes['Order']> };
  _Any: Scalars['_Any']['output'];
  _Entity: ApiResolversUnionTypes<ApiResolversParentTypes>['_Entity'];
  _Service: Api_Service;
  federation__FieldSet: Scalars['federation__FieldSet']['output'];
  federation__Policy: Scalars['federation__Policy']['output'];
  federation__Scope: Scalars['federation__Scope']['output'];
  link__Import: Scalars['link__Import']['output'];
};

export type ApiExternalDirectiveArgs = {
  reason: Maybe<Scalars['String']['input']>;
};

export type ApiExternalDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiExternalDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__AuthenticatedDirectiveArgs = { };

export type ApiFederation__AuthenticatedDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__AuthenticatedDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__ComposeDirectiveDirectiveArgs = {
  name: Maybe<Scalars['String']['input']>;
};

export type ApiFederation__ComposeDirectiveDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__ComposeDirectiveDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__ExtendsDirectiveArgs = { };

export type ApiFederation__ExtendsDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__ExtendsDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__InterfaceObjectDirectiveArgs = { };

export type ApiFederation__InterfaceObjectDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__InterfaceObjectDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__PolicyDirectiveArgs = {
  policies: Array<Array<Scalars['federation__Policy']['input']>>;
};

export type ApiFederation__PolicyDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__PolicyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__RequiresScopesDirectiveArgs = {
  scopes: Array<Array<Scalars['federation__Scope']['input']>>;
};

export type ApiFederation__RequiresScopesDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__RequiresScopesDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__TagDirectiveArgs = {
  name: Scalars['String']['input'];
};

export type ApiFederation__TagDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__TagDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiInaccessibleDirectiveArgs = { };

export type ApiInaccessibleDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiInaccessibleDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiKeyDirectiveArgs = {
  fields: Scalars['federation__FieldSet']['input'];
  resolvable?: Maybe<Scalars['Boolean']['input']>;
};

export type ApiKeyDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiKeyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiLinkDirectiveArgs = {
  as: Maybe<Scalars['String']['input']>;
  for: Maybe<ApiLink__Purpose>;
  import: Maybe<Array<Maybe<Scalars['link__Import']['input']>>>;
  url: Maybe<Scalars['String']['input']>;
};

export type ApiLinkDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiLinkDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiOverrideDirectiveArgs = {
  from: Scalars['String']['input'];
  label: Maybe<Scalars['String']['input']>;
};

export type ApiOverrideDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiOverrideDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiProvidesDirectiveArgs = {
  fields: Scalars['federation__FieldSet']['input'];
};

export type ApiProvidesDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiProvidesDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiRequiresDirectiveArgs = {
  fields: Scalars['federation__FieldSet']['input'];
};

export type ApiRequiresDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiRequiresDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiShareableDirectiveArgs = { };

export type ApiShareableDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiShareableDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export interface ApiBigIntScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export interface ApiCursorScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export interface ApiDateTimeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface ApiDecimalScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export interface ApiEmailScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Email'], any> {
  name: 'Email';
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
  orderMutation: Resolver<ApiResolversTypes['OrderMutation'], ParentType, ContextType>;
};

export type ApiNodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Node'] = ApiResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
};

export type ApiOrderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Order'] = ApiResolversParentTypes['Order']> = {
  cost: Resolver<ApiResolversTypes['OrderCost'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  number: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderStatus'], ParentType, ContextType>;
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

export type ApiOrderLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLine'] = ApiResolversParentTypes['OrderLine']> = {
  cost: Resolver<ApiResolversTypes['OrderLineCost'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasable: Resolver<ApiResolversTypes['Purchasable'], ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
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

export type ApiOrderMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderMutation'] = ApiResolversParentTypes['OrderMutation']> = {
  orderCreate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCreateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPurchasableResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Purchasable'] = ApiResolversParentTypes['Purchasable']> = {
  __resolveType: TypeResolveFn<'PurchasableSnapshot', ParentType, ContextType>;
};

export type ApiPurchasableSnapshotResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['PurchasableSnapshot'] = ApiResolversParentTypes['PurchasableSnapshot']> = {
  snapshot: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Query'] = ApiResolversParentTypes['Query']> = {
  _entities: Resolver<Array<Maybe<ApiResolversTypes['_Entity']>>, ParentType, ContextType, RequireFields<ApiQuery_EntitiesArgs, 'representations'>>;
  _service: Resolver<ApiResolversTypes['_Service'], ParentType, ContextType>;
};

export type ApiUserResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['User'] = ApiResolversParentTypes['User']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  orders: Resolver<Array<ApiResolversTypes['Order']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface Api_AnyScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['_Any'], any> {
  name: '_Any';
}

export type Api_EntityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['_Entity'] = ApiResolversParentTypes['_Entity']> = {
  __resolveType: TypeResolveFn<'User', ParentType, ContextType>;
};

export type Api_ServiceResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['_Service'] = ApiResolversParentTypes['_Service']> = {
  sdl: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiFederation__FieldSetScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['federation__FieldSet'], any> {
  name: 'federation__FieldSet';
}

export interface ApiFederation__PolicyScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['federation__Policy'], any> {
  name: 'federation__Policy';
}

export interface ApiFederation__ScopeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['federation__Scope'], any> {
  name: 'federation__Scope';
}

export interface ApiLink__ImportScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['link__Import'], any> {
  name: 'link__Import';
}

export type ApiResolvers<ContextType = GraphQLContext> = {
  BigInt: GraphQLScalarType;
  Cursor: GraphQLScalarType;
  DateTime: GraphQLScalarType;
  Decimal: GraphQLScalarType;
  Email: GraphQLScalarType;
  JSON: GraphQLScalarType;
  Money: ApiMoneyResolvers<ContextType>;
  Mutation: ApiMutationResolvers<ContextType>;
  Node: ApiNodeResolvers<ContextType>;
  Order: ApiOrderResolvers<ContextType>;
  OrderCost: ApiOrderCostResolvers<ContextType>;
  OrderLine: ApiOrderLineResolvers<ContextType>;
  OrderLineCost: ApiOrderLineCostResolvers<ContextType>;
  OrderMutation: ApiOrderMutationResolvers<ContextType>;
  Purchasable: ApiPurchasableResolvers<ContextType>;
  PurchasableSnapshot: ApiPurchasableSnapshotResolvers<ContextType>;
  Query: ApiQueryResolvers<ContextType>;
  User: ApiUserResolvers<ContextType>;
  _Any: GraphQLScalarType;
  _Entity: Api_EntityResolvers<ContextType>;
  _Service: Api_ServiceResolvers<ContextType>;
  federation__FieldSet: GraphQLScalarType;
  federation__Policy: GraphQLScalarType;
  federation__Scope: GraphQLScalarType;
  link__Import: GraphQLScalarType;
};

export type ApiDirectiveResolvers<ContextType = GraphQLContext> = {
  external: ApiExternalDirectiveResolver<any, any, ContextType>;
  federation__authenticated: ApiFederation__AuthenticatedDirectiveResolver<any, any, ContextType>;
  federation__composeDirective: ApiFederation__ComposeDirectiveDirectiveResolver<any, any, ContextType>;
  federation__extends: ApiFederation__ExtendsDirectiveResolver<any, any, ContextType>;
  federation__interfaceObject: ApiFederation__InterfaceObjectDirectiveResolver<any, any, ContextType>;
  federation__policy: ApiFederation__PolicyDirectiveResolver<any, any, ContextType>;
  federation__requiresScopes: ApiFederation__RequiresScopesDirectiveResolver<any, any, ContextType>;
  federation__tag: ApiFederation__TagDirectiveResolver<any, any, ContextType>;
  inaccessible: ApiInaccessibleDirectiveResolver<any, any, ContextType>;
  key: ApiKeyDirectiveResolver<any, any, ContextType>;
  link: ApiLinkDirectiveResolver<any, any, ContextType>;
  override: ApiOverrideDirectiveResolver<any, any, ContextType>;
  provides: ApiProvidesDirectiveResolver<any, any, ContextType>;
  requires: ApiRequiresDirectiveResolver<any, any, ContextType>;
  shareable: ApiShareableDirectiveResolver<any, any, ContextType>;
};
