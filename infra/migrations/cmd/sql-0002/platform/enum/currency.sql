-- Create enum type for currencies
CREATE TYPE currency AS ENUM (
    'USD', -- United States Dollar
    'EUR', -- Euro
    'GBP', -- British Pound Sterling
    'JPY', -- Japanese Yen
    'AUD', -- Australian Dollar
    'CAD', -- Canadian Dollar
    'CHF', -- Swiss Franc
    'CNY', -- Chinese Yuan
    'SEK', -- Swedish Krona
    'NZD', -- New Zealand Dollar
    'MXN', -- Mexican Peso
    'SGD', -- Singapore Dollar
    'HKD', -- Hong Kong Dollar
    'NOK', -- Norwegian Krone
    'KRW', -- South Korean Won
    'TRY', -- Turkish Lira
    'RUB', -- Russian Ruble
    'INR', -- Indian Rupee
    'BRL', -- Brazilian Real
    'ZAR', -- South African Rand
    'AED', -- United Arab Emirates Dirham
    'AFN', -- Afghan Afghani
    'ALL', -- Albanian Lek
    'AMD', -- Armenian Dram
    'ANG', -- Netherlands Antillean Guilder
    'AOA', -- Angolan Kwanza
    'ARS', -- Argentine Peso
    'AWG', -- Aruban Florin
    'AZN', -- Azerbaijani Manat
    'BAM', -- Bosnia and Herzegovina Convertible Mark
    'BBD', -- Barbadian Dollar
    'BDT', -- Bangladeshi Taka
    'BGN', -- Bulgarian Lev
    'BHD', -- Bahraini Dinar
    'BIF', -- Burundian Franc
    'BMD', -- Bermudian Dollar
    'BND', -- Brunei Dollar
    'BOB', -- Bolivian Boliviano
    'BSD', -- Bahamian Dollar
    'BTN', -- Bhutanese Ngultrum
    'BWP', -- Botswana Pula
    'BYN', -- Belarusian Ruble
    'BZD', -- Belize Dollar
    'CDF', -- Congolese Franc
    'CLP', -- Chilean Peso
    'COP', -- Colombian Peso
    'CRC', -- Costa Rican Colón
    'CUP', -- Cuban Peso
    'CVE', -- Cape Verdean Escudo
    'CZK', -- Czech Koruna
    'DJF', -- Djiboutian Franc
    'DKK', -- Danish Krone
    'DOP', -- Dominican Peso
    'DZD', -- Algerian Dinar
    'EGP', -- Egyptian Pound
    'ERN', -- Eritrean Nakfa
    'ETB', -- Ethiopian Birr
    'FJD', -- Fijian Dollar
    'FKP', -- Falkland Islands Pound
    'GEL', -- Georgian Lari
    'GGP', -- Guernsey Pound
    'GHS', -- Ghanaian Cedi
    'GIP', -- Gibraltar Pound
    'GMD', -- Gambian Dalasi
    'GNF', -- Guinean Franc
    'GTQ', -- Guatemalan Quetzal
    'GYD', -- Guyanaese Dollar
    'HNL', -- Honduran Lempira
    'HRK', -- Croatian Kuna
    'HTG', -- Haitian Gourde
    'HUF', -- Hungarian Forint
    'IDR', -- Indonesian Rupiah
    'ILS', -- Israeli New Shekel
    'IMP', -- Isle of Man Pound
    'IQD', -- Iraqi Dinar
    'IRR', -- Iranian Rial
    'ISK', -- Icelandic Króna
    'JEP', -- Jersey Pound
    'JMD', -- Jamaican Dollar
    'JOD', -- Jordanian Dinar
    'KES', -- Kenyan Shilling
    'KGS', -- Kyrgyzstani Som
    'KHR', -- Cambodian Riel
    'KMF', -- Comorian Franc
    'KPW', -- North Korean Won
    'KWD', -- Kuwaiti Dinar
    'KYD', -- Cayman Islands Dollar
    'KZT', -- Kazakhstani Tenge
    'LAK', -- Lao Kip
    'LBP', -- Lebanese Pound
    'LKR', -- Sri Lankan Rupee
    'LRD', -- Liberian Dollar
    'LSL', -- Lesotho Loti
    'LYD', -- Libyan Dinar
    'MAD', -- Moroccan Dirham
    'MDL', -- Moldovan Leu
    'MGA', -- Malagasy Ariary
    'MKD', -- Macedonian Denar
    'MMK', -- Myanmar Kyat
    'MNT', -- Mongolian Tugrik
    'MOP', -- Macanese Pataca
    'MRU', -- Mauritanian Ouguiya
    'MUR', -- Mauritian Rupee
    'MVR', -- Maldivian Rufiyaa
    'MWK', -- Malawian Kwacha
    'MYR', -- Malaysian Ringgit
    'MZN', -- Mozambican Metical
    'NAD', -- Namibian Dollar
    'NGN', -- Nigerian Naira
    'NIO', -- Nicaraguan Córdoba
    'NPR', -- Nepalese Rupee
    'OMR', -- Omani Rial
    'PAB', -- Panamanian Balboa
    'PEN', -- Peruvian Sol
    'PGK', -- Papua New Guinean Kina
    'PHP', -- Philippine Peso
    'PKR', -- Pakistani Rupee
    'PLN', -- Polish Złoty
    'PYG', -- Paraguayan Guaraní
    'QAR', -- Qatari Riyal
    'RON', -- Romanian Leu
    'RSD', -- Serbian Dinar
    'RUB', -- Russian Ruble
    'RWF', -- Rwandan Franc
    'SAR', -- Saudi Riyal
    'SBD', -- Solomon Islands Dollar
    'SCR', -- Seychellois Rupee
    'SDG', -- Sudanese Pound
    'SHP', -- Saint Helena Pound
    'SLL', -- Sierra Leonean Leone
    'SOS', -- Somali Shilling
    'SRD', -- Surinamese Dollar
    'SSP', -- South Sudanese Pound
    'STN', -- São Tomé and Príncipe Dobra
    'SYP', -- Syrian Pound
    'SZL', -- Eswatini Lilangeni
    'THB', -- Thai Baht
    'TJS', -- Tajikistani Somoni
    'TMT', -- Turkmenistani Manat
    'TND', -- Tunisian Dinar
    'TOP', -- Tongan Paʻanga
    'TTD', -- Trinidad and Tobago Dollar
    'TWD', -- New Taiwan Dollar
    'TZS', -- Tanzanian Shilling
    'UAH', -- Ukrainian Hryvnia
    'UGX', -- Ugandan Shilling
    'UYU', -- Uruguayan Peso
    'UZS', -- Uzbekistan Som
    'VES', -- Venezuelan Bolívar Soberano
    'VND', -- Vietnamese Đồng
    'VUV', -- Vanuatu Vatu
    'WST', -- Samoan Tālā
    'XAF', -- CFA Franc BEAC
    'XCD', -- East Caribbean Dollar
    'XOF', -- CFA Franc BCEAO
    'XPF', -- CFP Franc
    'YER', -- Yemeni Rial
    'ZMW', -- Zambian Kwacha
    'ZWL'  -- Zimbabwean Dollar
);
