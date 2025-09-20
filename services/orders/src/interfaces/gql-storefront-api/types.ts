import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '@src/interfaces/gql-admin-api/context.js';
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
  DateTime: { input: any; output: any; }
  Email: { input: any; output: any; }
  JSON: { input: unknown; output: unknown; }
  _Any: { input: any; output: any; }
  federation__FieldSet: { input: any; output: any; }
  federation__Policy: { input: any; output: any; }
  federation__Scope: { input: any; output: any; }
  link__Import: { input: any; output: any; }
};

export type ApiApiKey = {
  __typename?: 'ApiKey';
  id: Scalars['ID']['output'];
};

export type ApiCollectionMeta = {
  __typename?: 'CollectionMeta';
  count: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  pageCount: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
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

export type ApiCustomer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
};

export type ApiLabel = {
  __typename?: 'Label';
  id: Scalars['ID']['output'];
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
  adminNote: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: ApiOrderActor;
  currencyCode: Scalars['String']['output'];
  customerIdentity: ApiOrderCustomerIdentity;
  customerNote: Maybe<Scalars['String']['output']>;
  customerStatistic: ApiOrderCustomerStatistic;
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  discountTotal: Maybe<Scalars['BigInt']['output']>;
  events: Array<ApiOrderEvent>;
  grandTotal: Scalars['BigInt']['output'];
  id: Scalars['ID']['output'];
  labels: Array<ApiLabel>;
  lines: Array<ApiOrderLine>;
  number: Scalars['BigInt']['output'];
  shippingTotal: Maybe<Scalars['BigInt']['output']>;
  status: ApiOrderStatus;
  subtotal: Scalars['BigInt']['output'];
  tags: Array<ApiTag>;
  taxTotal: Maybe<Scalars['BigInt']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderActor = ApiApiKey | ApiUser;

export type ApiOrderAdminNoteUpdateInput = {
  note: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCancelInput = {
  comment: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
  reason: ApiOrderCancelReason;
};

export type ApiOrderCancelReason =
  | 'CUSTOMER'
  | 'FRAUD'
  | 'INVENTORY'
  | 'OTHER'
  | 'STAFF';

export type ApiOrderCloseInput = {
  comment: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCommentAddInput = {
  comment: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCustomerIdentity = {
  __typename?: 'OrderCustomerIdentity';
  countryCode: Maybe<ApiCountryCode>;
  customer: Maybe<ApiCustomer>;
  data: Maybe<Scalars['JSON']['output']>;
  email: Maybe<Scalars['Email']['output']>;
  phone: Maybe<Scalars['String']['output']>;
};

export type ApiOrderCustomerStatistic = {
  __typename?: 'OrderCustomerStatistic';
  totalAuthorizedOrders: Scalars['Int']['output'];
  totalGuestOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Int']['output'];
};

export type ApiOrderDeliveryAddress = {
  __typename?: 'OrderDeliveryAddress';
  address1: Scalars['String']['output'];
  address2: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  countryCode: ApiCountryCode;
  data: Maybe<Scalars['JSON']['output']>;
  email: Maybe<Scalars['Email']['output']>;
  firstName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName: Maybe<Scalars['String']['output']>;
  postalCode: Maybe<Scalars['String']['output']>;
  provinceCode: Maybe<Scalars['String']['output']>;
};

export type ApiOrderEvent = {
  __typename?: 'OrderEvent';
  createdAt: Scalars['DateTime']['output'];
  data: Maybe<Scalars['JSON']['output']>;
  eventType: ApiOrderEventType;
  id: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  performedBy: ApiOrderActor;
};

export type ApiOrderEventType =
  | 'ORDER_CREATED';

export type ApiOrderLine = {
  __typename?: 'OrderLine';
  createdAt: Scalars['DateTime']['output'];
  discountAmount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  purchasable: ApiPurchasable;
  purchasableId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  subtotalAmount: Scalars['Int']['output'];
  taxAmount: Maybe<Scalars['Int']['output']>;
  totalAmount: Scalars['Int']['output'];
  unitComparePrice: Scalars['Int']['output'];
  unitPrice: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderMutation = {
  __typename?: 'OrderMutation';
  orderAdminNoteUpdate: Scalars['Boolean']['output'];
  orderCancel: Scalars['Boolean']['output'];
  orderClose: Scalars['Boolean']['output'];
  orderCommentAdd: Scalars['Boolean']['output'];
};


export type ApiOrderMutationOrderAdminNoteUpdateArgs = {
  input: ApiOrderAdminNoteUpdateInput;
};


export type ApiOrderMutationOrderCancelArgs = {
  input: ApiOrderCancelInput;
};


export type ApiOrderMutationOrderCloseArgs = {
  input: ApiOrderCloseInput;
};


export type ApiOrderMutationOrderCommentAddArgs = {
  input: ApiOrderCommentAddInput;
};

export type ApiOrderQuery = {
  __typename?: 'OrderQuery';
  order: Maybe<ApiOrder>;
  orders: ApiOrdersOutput;
};


export type ApiOrderQueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type ApiOrderQueryOrdersArgs = {
  input: InputMaybe<ApiOrdersInput>;
};

export type ApiOrderStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'CLOSED'
  | 'DRAFT';

export type ApiOrdersInput = {
  order: InputMaybe<Scalars['String']['input']>;
  page: InputMaybe<Scalars['Int']['input']>;
  pageSize: InputMaybe<Scalars['Int']['input']>;
  where: InputMaybe<Scalars['JSON']['input']>;
};

export type ApiOrdersOutput = {
  __typename?: 'OrdersOutput';
  data: Array<ApiOrder>;
  meta: ApiCollectionMeta;
};

export type ApiPurchasable = ApiPurchasableSnapshot;

export type ApiPurchasableSnapshot = {
  __typename?: 'PurchasableSnapshot';
  snapshot: Scalars['JSON']['output'];
};

export type ApiQuery = {
  __typename?: 'Query';
  _entities: Array<Maybe<Api_Entity>>;
  _service: Api_Service;
  orderQuery: ApiOrderQuery;
};


export type ApiQuery_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};

export type ApiTag = {
  __typename?: 'Tag';
  id: Scalars['ID']['output'];
};

export type ApiUser = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
};

export type ApiWeight = {
  __typename?: 'Weight';
  unit: ApiWeightUnit;
  weight: Scalars['Float']['output'];
};

export type ApiWeightUnit =
  | 'GR'
  | 'KG'
  | 'LB'
  | 'OZ';

export type Api_Entity = ApiApiKey | ApiCustomer | ApiLabel | ApiTag | ApiUser;

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
  OrderActor: ( ApiApiKey ) | ( ApiUser );
  Purchasable: ( ApiPurchasableSnapshot );
  _Entity: ( ApiApiKey ) | ( ApiCustomer ) | ( ApiLabel ) | ( ApiTag ) | ( ApiUser );
};

/** Mapping of interface types */
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Node: never;
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  ApiKey: ResolverTypeWrapper<ApiApiKey>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CollectionMeta: ResolverTypeWrapper<ApiCollectionMeta>;
  CountryCode: ApiCountryCode;
  CurrencyCode: ApiCurrencyCode;
  Customer: ResolverTypeWrapper<ApiCustomer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Label: ResolverTypeWrapper<ApiLabel>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Node']>;
  Order: ResolverTypeWrapper<Omit<ApiOrder, 'createdBy' | 'events' | 'lines'> & { createdBy: ApiResolversTypes['OrderActor'], events: Array<ApiResolversTypes['OrderEvent']>, lines: Array<ApiResolversTypes['OrderLine']> }>;
  OrderActor: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>['OrderActor']>;
  OrderAdminNoteUpdateInput: ApiOrderAdminNoteUpdateInput;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCancelReason: ApiOrderCancelReason;
  OrderCloseInput: ApiOrderCloseInput;
  OrderCommentAddInput: ApiOrderCommentAddInput;
  OrderCustomerIdentity: ResolverTypeWrapper<ApiOrderCustomerIdentity>;
  OrderCustomerStatistic: ResolverTypeWrapper<ApiOrderCustomerStatistic>;
  OrderDeliveryAddress: ResolverTypeWrapper<ApiOrderDeliveryAddress>;
  OrderEvent: ResolverTypeWrapper<Omit<ApiOrderEvent, 'performedBy'> & { performedBy: ApiResolversTypes['OrderActor'] }>;
  OrderEventType: ApiOrderEventType;
  OrderLine: ResolverTypeWrapper<Omit<ApiOrderLine, 'purchasable'> & { purchasable: ApiResolversTypes['Purchasable'] }>;
  OrderMutation: ResolverTypeWrapper<ApiOrderMutation>;
  OrderQuery: ResolverTypeWrapper<Omit<ApiOrderQuery, 'order' | 'orders'> & { order: Maybe<ApiResolversTypes['Order']>, orders: ApiResolversTypes['OrdersOutput'] }>;
  OrderStatus: ApiOrderStatus;
  OrdersInput: ApiOrdersInput;
  OrdersOutput: ResolverTypeWrapper<Omit<ApiOrdersOutput, 'data'> & { data: Array<ApiResolversTypes['Order']> }>;
  Purchasable: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>['Purchasable']>;
  PurchasableSnapshot: ResolverTypeWrapper<ApiPurchasableSnapshot>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Tag: ResolverTypeWrapper<ApiTag>;
  User: ResolverTypeWrapper<ApiUser>;
  Weight: ResolverTypeWrapper<ApiWeight>;
  WeightUnit: ApiWeightUnit;
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
  ApiKey: ApiApiKey;
  BigInt: Scalars['BigInt']['output'];
  Boolean: Scalars['Boolean']['output'];
  CollectionMeta: ApiCollectionMeta;
  Customer: ApiCustomer;
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Label: ApiLabel;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Node'];
  Order: Omit<ApiOrder, 'createdBy' | 'events' | 'lines'> & { createdBy: ApiResolversParentTypes['OrderActor'], events: Array<ApiResolversParentTypes['OrderEvent']>, lines: Array<ApiResolversParentTypes['OrderLine']> };
  OrderActor: ApiResolversUnionTypes<ApiResolversParentTypes>['OrderActor'];
  OrderAdminNoteUpdateInput: ApiOrderAdminNoteUpdateInput;
  OrderCancelInput: ApiOrderCancelInput;
  OrderCloseInput: ApiOrderCloseInput;
  OrderCommentAddInput: ApiOrderCommentAddInput;
  OrderCustomerIdentity: ApiOrderCustomerIdentity;
  OrderCustomerStatistic: ApiOrderCustomerStatistic;
  OrderDeliveryAddress: ApiOrderDeliveryAddress;
  OrderEvent: Omit<ApiOrderEvent, 'performedBy'> & { performedBy: ApiResolversParentTypes['OrderActor'] };
  OrderLine: Omit<ApiOrderLine, 'purchasable'> & { purchasable: ApiResolversParentTypes['Purchasable'] };
  OrderMutation: ApiOrderMutation;
  OrderQuery: Omit<ApiOrderQuery, 'order' | 'orders'> & { order: Maybe<ApiResolversParentTypes['Order']>, orders: ApiResolversParentTypes['OrdersOutput'] };
  OrdersInput: ApiOrdersInput;
  OrdersOutput: Omit<ApiOrdersOutput, 'data'> & { data: Array<ApiResolversParentTypes['Order']> };
  Purchasable: ApiResolversUnionTypes<ApiResolversParentTypes>['Purchasable'];
  PurchasableSnapshot: ApiPurchasableSnapshot;
  Query: {};
  String: Scalars['String']['output'];
  Tag: ApiTag;
  User: ApiUser;
  Weight: ApiWeight;
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

export type ApiApiKeyResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ApiKey'] = ApiResolversParentTypes['ApiKey']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiBigIntScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type ApiCollectionMetaResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CollectionMeta'] = ApiResolversParentTypes['CollectionMeta']> = {
  count: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  page: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  pageCount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  pageSize: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  total: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCustomerResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Customer'] = ApiResolversParentTypes['Customer']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiDateTimeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface ApiEmailScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Email'], any> {
  name: 'Email';
}

export interface ApiJsonScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type ApiLabelResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Label'] = ApiResolversParentTypes['Label']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
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
  adminNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy: Resolver<ApiResolversTypes['OrderActor'], ParentType, ContextType>;
  currencyCode: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  customerIdentity: Resolver<ApiResolversTypes['OrderCustomerIdentity'], ParentType, ContextType>;
  customerNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  customerStatistic: Resolver<ApiResolversTypes['OrderCustomerStatistic'], ParentType, ContextType>;
  deletedAt: Resolver<Maybe<ApiResolversTypes['DateTime']>, ParentType, ContextType>;
  discountTotal: Resolver<Maybe<ApiResolversTypes['BigInt']>, ParentType, ContextType>;
  events: Resolver<Array<ApiResolversTypes['OrderEvent']>, ParentType, ContextType>;
  grandTotal: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  labels: Resolver<Array<ApiResolversTypes['Label']>, ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  number: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  shippingTotal: Resolver<Maybe<ApiResolversTypes['BigInt']>, ParentType, ContextType>;
  status: Resolver<ApiResolversTypes['OrderStatus'], ParentType, ContextType>;
  subtotal: Resolver<ApiResolversTypes['BigInt'], ParentType, ContextType>;
  tags: Resolver<Array<ApiResolversTypes['Tag']>, ParentType, ContextType>;
  taxTotal: Resolver<Maybe<ApiResolversTypes['BigInt']>, ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderActorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderActor'] = ApiResolversParentTypes['OrderActor']> = {
  __resolveType: TypeResolveFn<'ApiKey' | 'User', ParentType, ContextType>;
};

export type ApiOrderCustomerIdentityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCustomerIdentity'] = ApiResolversParentTypes['OrderCustomerIdentity']> = {
  countryCode: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  customer: Resolver<Maybe<ApiResolversTypes['Customer']>, ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCustomerStatisticResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCustomerStatistic'] = ApiResolversParentTypes['OrderCustomerStatistic']> = {
  totalAuthorizedOrders: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  totalGuestOrders: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  totalRevenue: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryAddressResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryAddress'] = ApiResolversParentTypes['OrderDeliveryAddress']> = {
  address1: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  address2: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  city: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  countryCode: Resolver<ApiResolversTypes['CountryCode'], ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  postalCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  provinceCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderEventResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderEvent'] = ApiResolversParentTypes['OrderEvent']> = {
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  eventType: Resolver<ApiResolversTypes['OrderEventType'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  metadata: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  performedBy: Resolver<ApiResolversTypes['OrderActor'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLine'] = ApiResolversParentTypes['OrderLine']> = {
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  discountAmount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasable: Resolver<ApiResolversTypes['Purchasable'], ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  subtotalAmount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  taxAmount: Resolver<Maybe<ApiResolversTypes['Int']>, ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  unitComparePrice: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  unitPrice: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderMutation'] = ApiResolversParentTypes['OrderMutation']> = {
  orderAdminNoteUpdate: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderAdminNoteUpdateArgs, 'input'>>;
  orderCancel: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCancelArgs, 'input'>>;
  orderClose: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCloseArgs, 'input'>>;
  orderCommentAdd: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCommentAddArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderQuery'] = ApiResolversParentTypes['OrderQuery']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType, RequireFields<ApiOrderQueryOrderArgs, 'id'>>;
  orders: Resolver<ApiResolversTypes['OrdersOutput'], ParentType, ContextType, ApiOrderQueryOrdersArgs>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrdersOutputResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrdersOutput'] = ApiResolversParentTypes['OrdersOutput']> = {
  data: Resolver<Array<ApiResolversTypes['Order']>, ParentType, ContextType>;
  meta: Resolver<ApiResolversTypes['CollectionMeta'], ParentType, ContextType>;
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
  orderQuery: Resolver<ApiResolversTypes['OrderQuery'], ParentType, ContextType>;
};

export type ApiTagResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Tag'] = ApiResolversParentTypes['Tag']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiUserResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['User'] = ApiResolversParentTypes['User']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiWeightResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Weight'] = ApiResolversParentTypes['Weight']> = {
  unit: Resolver<ApiResolversTypes['WeightUnit'], ParentType, ContextType>;
  weight: Resolver<ApiResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface Api_AnyScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['_Any'], any> {
  name: '_Any';
}

export type Api_EntityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['_Entity'] = ApiResolversParentTypes['_Entity']> = {
  __resolveType: TypeResolveFn<'ApiKey' | 'Customer' | 'Label' | 'Tag' | 'User', ParentType, ContextType>;
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
  ApiKey: ApiApiKeyResolvers<ContextType>;
  BigInt: GraphQLScalarType;
  CollectionMeta: ApiCollectionMetaResolvers<ContextType>;
  Customer: ApiCustomerResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  Email: GraphQLScalarType;
  JSON: GraphQLScalarType;
  Label: ApiLabelResolvers<ContextType>;
  Mutation: ApiMutationResolvers<ContextType>;
  Node: ApiNodeResolvers<ContextType>;
  Order: ApiOrderResolvers<ContextType>;
  OrderActor: ApiOrderActorResolvers<ContextType>;
  OrderCustomerIdentity: ApiOrderCustomerIdentityResolvers<ContextType>;
  OrderCustomerStatistic: ApiOrderCustomerStatisticResolvers<ContextType>;
  OrderDeliveryAddress: ApiOrderDeliveryAddressResolvers<ContextType>;
  OrderEvent: ApiOrderEventResolvers<ContextType>;
  OrderLine: ApiOrderLineResolvers<ContextType>;
  OrderMutation: ApiOrderMutationResolvers<ContextType>;
  OrderQuery: ApiOrderQueryResolvers<ContextType>;
  OrdersOutput: ApiOrdersOutputResolvers<ContextType>;
  Purchasable: ApiPurchasableResolvers<ContextType>;
  PurchasableSnapshot: ApiPurchasableSnapshotResolvers<ContextType>;
  Query: ApiQueryResolvers<ContextType>;
  Tag: ApiTagResolvers<ContextType>;
  User: ApiUserResolvers<ContextType>;
  Weight: ApiWeightResolvers<ContextType>;
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
