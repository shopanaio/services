package main

// Currency codes according to ISO 4217
type CurrencyCode string

const (
	// 2 decimals — UAE Dirham (United Arab Emirates)
	CurrencyCodeAed CurrencyCode = "AED"
	// 2 decimals — Afghan Afghani (Afghanistan)
	CurrencyCodeAfn CurrencyCode = "AFN"
	// 2 decimals — Albanian Lek (Albania)
	CurrencyCodeAll CurrencyCode = "ALL"
	// 2 decimals — Armenian Dram (Armenia)
	CurrencyCodeAmd CurrencyCode = "AMD"
	// 2 decimals — Netherlands Antillean Guilder (Netherlands Antilles)
	CurrencyCodeAng CurrencyCode = "ANG"
	// 2 decimals — Angolan Kwanza (Angola)
	CurrencyCodeAoa CurrencyCode = "AOA"
	// 2 decimals — Argentine Peso (Argentina)
	CurrencyCodeArs CurrencyCode = "ARS"
	// 2 decimals — Australian Dollar (Australia)
	CurrencyCodeAud CurrencyCode = "AUD"
	// 2 decimals — Aruban Florin (Aruba)
	CurrencyCodeAwg CurrencyCode = "AWG"
	// 2 decimals — Azerbaijani Manat (Azerbaijan)
	CurrencyCodeAzn CurrencyCode = "AZN"
	// 2 decimals — Bosnia-Herzegovina Convertible Mark (Bosnia and Herzegovina)
	CurrencyCodeBam CurrencyCode = "BAM"
	// 2 decimals — Barbadian Dollar (Barbados)
	CurrencyCodeBbd CurrencyCode = "BBD"
	// 2 decimals — Bangladeshi Taka (Bangladesh)
	CurrencyCodeBdt CurrencyCode = "BDT"
	// 2 decimals — Bulgarian Lev (Bulgaria)
	CurrencyCodeBgn CurrencyCode = "BGN"
	// 3 decimals — Bahraini Dinar (Bahrain)
	CurrencyCodeBhd CurrencyCode = "BHD"
	// 0 decimals — Burundian Franc (Burundi)
	CurrencyCodeBif CurrencyCode = "BIF"
	// 2 decimals — Bermudian Dollar (Bermuda)
	CurrencyCodeBmd CurrencyCode = "BMD"
	// 2 decimals — Brunei Dollar (Brunei)
	CurrencyCodeBnd CurrencyCode = "BND"
	// 2 decimals — Bolivian Boliviano (Bolivia)
	CurrencyCodeBob CurrencyCode = "BOB"
	// 2 decimals — Brazilian Real (Brazil)
	CurrencyCodeBrl CurrencyCode = "BRL"
	// 2 decimals — Bahamian Dollar (Bahamas)
	CurrencyCodeBsd CurrencyCode = "BSD"
	// 2 decimals — Bhutanese Ngultrum (Bhutan)
	CurrencyCodeBtn CurrencyCode = "BTN"
	// 2 decimals — Botswana Pula (Botswana)
	CurrencyCodeBwp CurrencyCode = "BWP"
	// 2 decimals — Belarusian Ruble (Belarus)
	CurrencyCodeByn CurrencyCode = "BYN"
	// 2 decimals — Belize Dollar (Belize)
	CurrencyCodeBzd CurrencyCode = "BZD"
	// 2 decimals — Canadian Dollar (Canada)
	CurrencyCodeCad CurrencyCode = "CAD"
	// 2 decimals — Congolese Franc (Democratic Republic of the Congo)
	CurrencyCodeCdf CurrencyCode = "CDF"
	// 2 decimals — Swiss Franc (Switzerland)
	CurrencyCodeChf CurrencyCode = "CHF"
	// 0 decimals — Chilean Peso (Chile)
	CurrencyCodeClp CurrencyCode = "CLP"
	// 2 decimals — Chinese Yuan (China)
	CurrencyCodeCny CurrencyCode = "CNY"
	// 2 decimals — Colombian Peso (Colombia)
	CurrencyCodeCop CurrencyCode = "COP"
	// 2 decimals — Costa Rican Colon (Costa Rica)
	CurrencyCodeCrc CurrencyCode = "CRC"
	// 2 decimals — Cuban Peso (Cuba)
	CurrencyCodeCup CurrencyCode = "CUP"
	// 2 decimals — Cape Verdean Escudo (Cape Verde)
	CurrencyCodeCve CurrencyCode = "CVE"
	// 2 decimals — Czech Koruna (Czech Republic)
	CurrencyCodeCzk CurrencyCode = "CZK"
	// 0 decimals — Djiboutian Franc (Djibouti)
	CurrencyCodeDjf CurrencyCode = "DJF"
	// 2 decimals — Danish Krone (Denmark)
	CurrencyCodeDkk CurrencyCode = "DKK"
	// 2 decimals — Dominican Peso (Dominican Republic)
	CurrencyCodeDop CurrencyCode = "DOP"
	// 2 decimals — Algerian Dinar (Algeria)
	CurrencyCodeDzd CurrencyCode = "DZD"
	// 2 decimals — Egyptian Pound (Egypt)
	CurrencyCodeEgp CurrencyCode = "EGP"
	// 2 decimals — Eritrean Nakfa (Eritrea)
	CurrencyCodeErn CurrencyCode = "ERN"
	// 2 decimals — Ethiopian Birr (Ethiopia)
	CurrencyCodeEtb CurrencyCode = "ETB"
	// 2 decimals — Euro (European Union)
	CurrencyCodeEur CurrencyCode = "EUR"
	// 2 decimals — Fijian Dollar (Fiji)
	CurrencyCodeFjd CurrencyCode = "FJD"
	// 2 decimals — Falkland Islands Pound (Falkland Islands)
	CurrencyCodeFkp CurrencyCode = "FKP"
	// 2 decimals — Faroese Króna (Faroe Islands)
	CurrencyCodeFok CurrencyCode = "FOK"
	// 2 decimals — Pound Sterling (United Kingdom)
	CurrencyCodeGbp CurrencyCode = "GBP"
	// 2 decimals — Georgian Lari (Georgia)
	CurrencyCodeGel CurrencyCode = "GEL"
	// 2 decimals — Guernsey Pound (Guernsey)
	CurrencyCodeGgp CurrencyCode = "GGP"
	// 2 decimals — Ghanaian Cedi (Ghana)
	CurrencyCodeGhs CurrencyCode = "GHS"
	// 2 decimals — Gibraltar Pound (Gibraltar)
	CurrencyCodeGip CurrencyCode = "GIP"
	// 2 decimals — Gambian Dalasi (Gambia)
	CurrencyCodeGmd CurrencyCode = "GMD"
	// 0 decimals — Guinean Franc (Guinea)
	CurrencyCodeGnf CurrencyCode = "GNF"
	// 2 decimals — Guatemalan Quetzal (Guatemala)
	CurrencyCodeGtq CurrencyCode = "GTQ"
	// 2 decimals — Guyanese Dollar (Guyana)
	CurrencyCodeGyd CurrencyCode = "GYD"
	// 2 decimals — Hong Kong Dollar (Hong Kong)
	CurrencyCodeHkd CurrencyCode = "HKD"
	// 2 decimals — Honduran Lempira (Honduras)
	CurrencyCodeHnl CurrencyCode = "HNL"
	// 2 decimals — Croatian Kuna (Croatia)
	CurrencyCodeHrk CurrencyCode = "HRK"
	// 2 decimals — Haitian Gourde (Haiti)
	CurrencyCodeHtg CurrencyCode = "HTG"
	// 2 decimals — Hungarian Forint (Hungary)
	CurrencyCodeHuf CurrencyCode = "HUF"
	// 0 decimals — Indonesian Rupiah (Indonesia)
	CurrencyCodeIDR CurrencyCode = "IDR"
	// 2 decimals — Israeli New Shekel (Israel)
	CurrencyCodeIls CurrencyCode = "ILS"
	// 2 decimals — Isle of Man Pound (Isle of Man)
	CurrencyCodeImp CurrencyCode = "IMP"
	// 2 decimals — Indian Rupee (India)
	CurrencyCodeInr CurrencyCode = "INR"
	// 3 decimals — Iraqi Dinar (Iraq)
	CurrencyCodeIqd CurrencyCode = "IQD"
	// 2 decimals — Iranian Rial (Iran)
	CurrencyCodeIrr CurrencyCode = "IRR"
	// 0 decimals — Icelandic Króna (Iceland)
	CurrencyCodeIsk CurrencyCode = "ISK"
	// 2 decimals — Jersey Pound (Jersey)
	CurrencyCodeJep CurrencyCode = "JEP"
	// 2 decimals — Jamaican Dollar (Jamaica)
	CurrencyCodeJmd CurrencyCode = "JMD"
	// 3 decimals — Jordanian Dinar (Jordan)
	CurrencyCodeJod CurrencyCode = "JOD"
	// 0 decimals — Japanese Yen (Japan)
	CurrencyCodeJpy CurrencyCode = "JPY"
	// 2 decimals — Kenyan Shilling (Kenya)
	CurrencyCodeKes CurrencyCode = "KES"
	// 2 decimals — Kyrgyzstani Som (Kyrgyzstan)
	CurrencyCodeKgs CurrencyCode = "KGS"
	// 2 decimals — Cambodian Riel (Cambodia)
	CurrencyCodeKhr CurrencyCode = "KHR"
	// 2 decimals — Comorian Franc (Comoros)
	CurrencyCodeKmf CurrencyCode = "KMF"
	// 2 decimals — North Korean Won (North Korea)
	CurrencyCodeKpw CurrencyCode = "KPW"
	// 2 decimals — South Korean Won (South Korea)
	CurrencyCodeKrw CurrencyCode = "KRW"
	// 3 decimals — Kuwaiti Dinar (Kuwait)
	CurrencyCodeKwd CurrencyCode = "KWD"
	// 2 decimals — Cayman Islands Dollar (Cayman Islands)
	CurrencyCodeKyd CurrencyCode = "KYD"
	// 2 decimals — Kazakhstani Tenge (Kazakhstan)
	CurrencyCodeKzt CurrencyCode = "KZT"
	// 2 decimals — Lao Kip (Laos)
	CurrencyCodeLak CurrencyCode = "LAK"
	// 2 decimals — Lebanese Pound (Lebanon)
	CurrencyCodeLbp CurrencyCode = "LBP"
	// 2 decimals — Sri Lankan Rupee (Sri Lanka)
	CurrencyCodeLkr CurrencyCode = "LKR"
	// 3 decimals — Liberian Dollar (Liberia)
	CurrencyCodeLrd CurrencyCode = "LRD"
	// 3 decimals — Libyan Dinar (Libya)
	CurrencyCodeLyd CurrencyCode = "LYD"
	// 2 decimals — Moroccan Dirham (Morocco)
	CurrencyCodeMad CurrencyCode = "MAD"
	// 2 decimals — Moldovan Leu (Moldova)
	CurrencyCodeMdl CurrencyCode = "MDL"
	// 2 decimals — Malagasy Ariary (Madagascar)
	CurrencyCodeMga CurrencyCode = "MGA"
	// 2 decimals — Macedonian Denar (North Macedonia)
	CurrencyCodeMkd CurrencyCode = "MKD"
	// 2 decimals — Burmese Kyat (Myanmar)
	CurrencyCodeMmk CurrencyCode = "MMK"
	// 2 decimals — Mongolian Tögrög (Mongolia)
	CurrencyCodeMnt CurrencyCode = "MNT"
	// 2 decimals — Macanese Pataca (Macau)
	CurrencyCodeMop CurrencyCode = "MOP"
	// 2 decimals — Mauritanian Ouguiya (Mauritania)
	CurrencyCodeMru CurrencyCode = "MRU"
	// 2 decimals — Mauritian Rupee (Mauritius)
	CurrencyCodeMur CurrencyCode = "MUR"
	// 2 decimals — Maldivian Rufiyaa (Maldives)
	CurrencyCodeMvr CurrencyCode = "MVR"
	// 2 decimals — Malawian Kwacha (Malawi)
	CurrencyCodeMwk CurrencyCode = "MWK"
	// 2 decimals — Mexican Peso (Mexico)
	CurrencyCodeMxn CurrencyCode = "MXN"
	// 2 decimals — Malaysian Ringgit (Malaysia)
	CurrencyCodeMyr CurrencyCode = "MYR"
	// 2 decimals — Mozambican Metical (Mozambique)
	CurrencyCodeMzn CurrencyCode = "MZN"
	// 2 decimals — Namibian Dollar (Namibia)
	CurrencyCodeNad CurrencyCode = "NAD"
	// 2 decimals — Nigerian Naira (Nigeria)
	CurrencyCodeNgn CurrencyCode = "NGN"
	// 2 decimals — Nicaraguan Córdoba (Nicaragua)
	CurrencyCodeNio CurrencyCode = "NIO"
	// 2 decimals — Norwegian Krone (Norway)
	CurrencyCodeNok CurrencyCode = "NOK"
	// 2 decimals — Nepalese Rupee (Nepal)
	CurrencyCodeNpr CurrencyCode = "NPR"
	// 2 decimals — New Zealand Dollar (New Zealand)
	CurrencyCodeNzd CurrencyCode = "NZD"
	// 2 decimals — Omani Rial (Oman)
	CurrencyCodeOmr CurrencyCode = "OMR"
	// 2 decimals — Panamanian Balboa (Panama)
	CurrencyCodePab CurrencyCode = "PAB"
	// 2 decimals — Peruvian Sol (Peru)
	CurrencyCodePen CurrencyCode = "PEN"
	// 0 decimals — Papua New Guinean Kina (Papua New Guinea)
	CurrencyCodePgk CurrencyCode = "PGK"
	// 2 decimals — Philippine Peso (Philippines)
	CurrencyCodePhp CurrencyCode = "PHP"
	// 2 decimals — Pakistani Rupee (Pakistan)
	CurrencyCodePkr CurrencyCode = "PKR"
	// 0 decimals — Polish Zloty (Poland)
	CurrencyCodePln CurrencyCode = "PLN"
	// 2 decimals — Paraguayan Guaraní (Paraguay)
	CurrencyCodePyg CurrencyCode = "PYG"
	// 2 decimals — Qatari Riyal (Qatar)
	CurrencyCodeQar CurrencyCode = "QAR"
	// 2 decimals — Romanian Leu (Romania)
	CurrencyCodeRon CurrencyCode = "RON"
	// 2 decimals — Serbian Dinar (Serbia)
	CurrencyCodeRsd CurrencyCode = "RSD"
	// 2 decimals — Russian Ruble (Russia)
	CurrencyCodeRub CurrencyCode = "RUB"
	// 2 decimals — Rwandan Franc (Rwanda)
	CurrencyCodeRwf CurrencyCode = "RWF"
	// 2 decimals — Saudi Riyal (Saudi Arabia)
	CurrencyCodeSar CurrencyCode = "SAR"
	// 2 decimals — Solomon Islands Dollar (Solomon Islands)
	CurrencyCodeSbd CurrencyCode = "SBD"
	// 2 decimals — Seychelles Rupee (Seychelles)
	CurrencyCodeScr CurrencyCode = "SCR"
	// 2 decimals — Sudanese Pound (Sudan)
	CurrencyCodeSdg CurrencyCode = "SDG"
	// 2 decimals — Swedish Krona (Sweden)
	CurrencyCodeSek CurrencyCode = "SEK"
	// 2 decimals — Singapore Dollar (Singapore)
	CurrencyCodeSgd CurrencyCode = "SGD"
	// 0 decimals — Saint Helena Pound (Saint Helena)
	CurrencyCodeShp CurrencyCode = "SHP"
	// 2 decimals — Sierra Leonean Leone (Sierra Leone)
	CurrencyCodeSle CurrencyCode = "SLE"
	// 2 decimals — Somali Shilling (Somalia)
	CurrencyCodeSos CurrencyCode = "SOS"
	// 2 decimals — Surinamese Dollar (Suriname)
	CurrencyCodeSrd CurrencyCode = "SRD"
	// 2 decimals — South Sudanese Pound (South Sudan)
	CurrencyCodeSsp CurrencyCode = "SSP"
	// 2 decimals — São Tomé and Príncipe Dobra (São Tomé and Príncipe)
	CurrencyCodeStn CurrencyCode = "STN"
	// 2 decimals — Salvadoran Colón (El Salvador)
	CurrencyCodeSvc CurrencyCode = "SVC"
	// 2 decimals — Syrian Pound (Syria)
	CurrencyCodeSyp CurrencyCode = "SYP"
	// 2 decimals — Eswatini Lilangeni (Eswatini)
	CurrencyCodeSzl CurrencyCode = "SZL"
	// 2 decimals — Thai Baht (Thailand)
	CurrencyCodeThb CurrencyCode = "THB"
	// 2 decimals — Tajikistani Somoni (Tajikistan)
	CurrencyCodeTjs CurrencyCode = "TJS"
	// 2 decimals — Turkmenistani Manat (Turkmenistan)
	CurrencyCodeTmt CurrencyCode = "TMT"
	// 2 decimals — Tunisian Dinar (Tunisia)
	CurrencyCodeTnd CurrencyCode = "TND"
	// 2 decimals — Tongan Paʻanga (Tonga)
	CurrencyCodeTop CurrencyCode = "TOP"
	// 2 decimals — Turkish Lira (Türkiye)
	CurrencyCodeTry CurrencyCode = "TRY"
	// 2 decimals — Trinidad and Tobago Dollar (Trinidad and Tobago)
	CurrencyCodeTtd CurrencyCode = "TTD"
	// 2 decimals — New Taiwan Dollar (Taiwan)
	CurrencyCodeTwd CurrencyCode = "TWD"
	// 0 decimals — Tanzanian Shilling (Tanzania)
	CurrencyCodeTzs CurrencyCode = "TZS"
	// 2 decimals — Ukrainian Hryvnia (Ukraine)
	CurrencyCodeUah CurrencyCode = "UAH"
	// 2 decimals — Ugandan Shilling (Uganda)
	CurrencyCodeUgx CurrencyCode = "UGX"
	// 2 decimals — United States Dollar (United States)
	CurrencyCodeUsd CurrencyCode = "USD"
	// 2 decimals — Uruguayan Peso (Uruguay)
	CurrencyCodeUyu CurrencyCode = "UYU"
	// 2 decimals — Uzbekistan Som (Uzbekistan)
	CurrencyCodeUzs CurrencyCode = "UZS"
	// 2 decimals — Venezuelan Bolívar (Venezuela)
	CurrencyCodeVes CurrencyCode = "VES"
	// 0 decimals — Vietnamese Dong (Vietnam)
	CurrencyCodeVnd CurrencyCode = "VND"
	// 2 decimals — Vanuatu Vatu (Vanuatu)
	CurrencyCodeVuv CurrencyCode = "VUV"
	// 2 decimals — Samoan Tala (Samoa)
	CurrencyCodeWst CurrencyCode = "WST"
	// 2 decimals — Central African CFA Franc (CEMAC)
	CurrencyCodeXaf CurrencyCode = "XAF"
	// 0 decimals — East Caribbean Dollar (OECS)
	CurrencyCodeXcd CurrencyCode = "XCD"
	// 0 decimals — Special Drawing Rights (IMF)
	CurrencyCodeXdr CurrencyCode = "XDR"
	// 0 decimals — West African CFA Franc (UEMOA)
	CurrencyCodeXof CurrencyCode = "XOF"
	// 0 decimals — CFP Franc (French overseas territories)
	CurrencyCodeXpf CurrencyCode = "XPF"
	// 2 decimals — Yemeni Rial (Yemen)
	CurrencyCodeYer CurrencyCode = "YER"
	// 2 decimals — South African Rand (South Africa)
	CurrencyCodeZar CurrencyCode = "ZAR"
	// 2 decimals — Zambian Kwacha (Zambia)
	CurrencyCodeZmw CurrencyCode = "ZMW"
	// 2 decimals — Zimbabwean Dollar (Zimbabwe)
	CurrencyCodeZwl CurrencyCode = "ZWL"
)

var AllCurrencyCode = []CurrencyCode{
	CurrencyCodeAed,
	CurrencyCodeAfn,
	CurrencyCodeAll,
	CurrencyCodeAmd,
	CurrencyCodeAng,
	CurrencyCodeAoa,
	CurrencyCodeArs,
	CurrencyCodeAud,
	CurrencyCodeAwg,
	CurrencyCodeAzn,
	CurrencyCodeBam,
	CurrencyCodeBbd,
	CurrencyCodeBdt,
	CurrencyCodeBgn,
	CurrencyCodeBhd,
	CurrencyCodeBif,
	CurrencyCodeBmd,
	CurrencyCodeBnd,
	CurrencyCodeBob,
	CurrencyCodeBrl,
	CurrencyCodeBsd,
	CurrencyCodeBtn,
	CurrencyCodeBwp,
	CurrencyCodeByn,
	CurrencyCodeBzd,
	CurrencyCodeCad,
	CurrencyCodeCdf,
	CurrencyCodeChf,
	CurrencyCodeClp,
	CurrencyCodeCny,
	CurrencyCodeCop,
	CurrencyCodeCrc,
	CurrencyCodeCup,
	CurrencyCodeCve,
	CurrencyCodeCzk,
	CurrencyCodeDjf,
	CurrencyCodeDkk,
	CurrencyCodeDop,
	CurrencyCodeDzd,
	CurrencyCodeEgp,
	CurrencyCodeErn,
	CurrencyCodeEtb,
	CurrencyCodeEur,
	CurrencyCodeFjd,
	CurrencyCodeFkp,
	CurrencyCodeFok,
	CurrencyCodeGbp,
	CurrencyCodeGel,
	CurrencyCodeGgp,
	CurrencyCodeGhs,
	CurrencyCodeGip,
	CurrencyCodeGmd,
	CurrencyCodeGnf,
	CurrencyCodeGtq,
	CurrencyCodeGyd,
	CurrencyCodeHkd,
	CurrencyCodeHnl,
	CurrencyCodeHrk,
	CurrencyCodeHtg,
	CurrencyCodeHuf,
	CurrencyCodeIDR,
	CurrencyCodeIls,
	CurrencyCodeImp,
	CurrencyCodeInr,
	CurrencyCodeIqd,
	CurrencyCodeIrr,
	CurrencyCodeIsk,
	CurrencyCodeJep,
	CurrencyCodeJmd,
	CurrencyCodeJod,
	CurrencyCodeJpy,
	CurrencyCodeKes,
	CurrencyCodeKgs,
	CurrencyCodeKhr,
	CurrencyCodeKmf,
	CurrencyCodeKpw,
	CurrencyCodeKrw,
	CurrencyCodeKwd,
	CurrencyCodeKyd,
	CurrencyCodeKzt,
	CurrencyCodeLak,
	CurrencyCodeLbp,
	CurrencyCodeLkr,
	CurrencyCodeLrd,
	CurrencyCodeLyd,
	CurrencyCodeMad,
	CurrencyCodeMdl,
	CurrencyCodeMga,
	CurrencyCodeMkd,
	CurrencyCodeMmk,
	CurrencyCodeMnt,
	CurrencyCodeMop,
	CurrencyCodeMru,
	CurrencyCodeMur,
	CurrencyCodeMvr,
	CurrencyCodeMwk,
	CurrencyCodeMxn,
	CurrencyCodeMyr,
	CurrencyCodeMzn,
	CurrencyCodeNad,
	CurrencyCodeNgn,
	CurrencyCodeNio,
	CurrencyCodeNok,
	CurrencyCodeNpr,
	CurrencyCodeNzd,
	CurrencyCodeOmr,
	CurrencyCodePab,
	CurrencyCodePen,
	CurrencyCodePgk,
	CurrencyCodePhp,
	CurrencyCodePkr,
	CurrencyCodePln,
	CurrencyCodePyg,
	CurrencyCodeQar,
	CurrencyCodeRon,
	CurrencyCodeRsd,
	CurrencyCodeRub,
	CurrencyCodeRwf,
	CurrencyCodeSar,
	CurrencyCodeSbd,
	CurrencyCodeScr,
	CurrencyCodeSdg,
	CurrencyCodeSek,
	CurrencyCodeSgd,
	CurrencyCodeShp,
	CurrencyCodeSle,
	CurrencyCodeSos,
	CurrencyCodeSrd,
	CurrencyCodeSsp,
	CurrencyCodeStn,
	CurrencyCodeSvc,
	CurrencyCodeSyp,
	CurrencyCodeSzl,
	CurrencyCodeThb,
	CurrencyCodeTjs,
	CurrencyCodeTmt,
	CurrencyCodeTnd,
	CurrencyCodeTop,
	CurrencyCodeTry,
	CurrencyCodeTtd,
	CurrencyCodeTwd,
	CurrencyCodeTzs,
	CurrencyCodeUah,
	CurrencyCodeUgx,
	CurrencyCodeUsd,
	CurrencyCodeUyu,
	CurrencyCodeUzs,
	CurrencyCodeVes,
	CurrencyCodeVnd,
	CurrencyCodeVuv,
	CurrencyCodeWst,
	CurrencyCodeXaf,
	CurrencyCodeXcd,
	CurrencyCodeXdr,
	CurrencyCodeXof,
	CurrencyCodeXpf,
	CurrencyCodeYer,
	CurrencyCodeZar,
	CurrencyCodeZmw,
	CurrencyCodeZwl,
}
