// ── Italian rail stations with real coordinates ────────────────────────
// ~80 major/medium stations. Connections define direct rail segments.

export const STATIONS = [
  // ── Piemonte ──
  { id: 'TO',   name: 'Torino P.N.',       lat: 45.0607, lng: 7.6758,  major: true },
  { id: 'TO_P', name: 'Torino Porta Susa',  lat: 45.0748, lng: 7.6688,  major: false },
  { id: 'NO',   name: 'Novara',             lat: 45.4460, lng: 8.6260,  major: false },
  { id: 'AL',   name: 'Alessandria',        lat: 44.9130, lng: 8.6160,  major: false },
  { id: 'CN',   name: 'Cuneo',              lat: 44.3850, lng: 7.5460,  major: false },
  { id: 'BI',   name: 'Biella S.P.',        lat: 45.5660, lng: 8.0530,  major: false },
  // ── Lombardia ──
  { id: 'MI',   name: 'Milano Centrale',    lat: 45.4862, lng: 9.2040,  major: true },
  { id: 'MI_P', name: 'Milano P.Garibaldi', lat: 45.4847, lng: 9.1878,  major: false },
  { id: 'BS',   name: 'Brescia',            lat: 45.5350, lng: 10.2140, major: false },
  { id: 'BG',   name: 'Bergamo',            lat: 45.6940, lng: 9.6700,  major: false },
  { id: 'CO',   name: 'Como S.G.',          lat: 45.8100, lng: 9.0860,  major: false },
  { id: 'MN',   name: 'Mantova',            lat: 45.1540, lng: 10.7870, major: false },
  { id: 'PV',   name: 'Pavia',              lat: 45.1850, lng: 9.1550,  major: false },
  { id: 'CR',   name: 'Cremona',            lat: 45.1330, lng: 10.0260, major: false },
  { id: 'SO',   name: 'Sondrio',            lat: 46.1700, lng: 9.8790,  major: false },
  // ── Veneto / FVG / Trentino ──
  { id: 'VE',   name: 'Venezia S.L.',       lat: 45.4410, lng: 12.3210, major: true },
  { id: 'VE_M', name: 'Venezia Mestre',     lat: 45.4890, lng: 12.2390, major: false },
  { id: 'VR',   name: 'Verona P.N.',        lat: 45.4290, lng: 10.9830, major: true },
  { id: 'PD',   name: 'Padova',             lat: 45.4070, lng: 11.8730, major: false },
  { id: 'VI',   name: 'Vicenza',            lat: 45.5430, lng: 11.5350, major: false },
  { id: 'TV',   name: 'Treviso',            lat: 45.6530, lng: 12.2450, major: false },
  { id: 'UD',   name: 'Udine',              lat: 46.0610, lng: 13.2320, major: false },
  { id: 'TS',   name: 'Trieste Centrale',   lat: 45.6530, lng: 13.7580, major: false },
  { id: 'TN',   name: 'Trento',             lat: 46.0670, lng: 11.1210, major: false },
  { id: 'BZ',   name: 'Bolzano',            lat: 46.4980, lng: 11.3540, major: false },
  { id: 'RO',   name: 'Rovigo',             lat: 45.0700, lng: 11.7900, major: false },
  // ── Liguria ──
  { id: 'GE',   name: 'Genova P.P.',        lat: 44.4158, lng: 8.9208,  major: true },
  { id: 'GE_B', name: 'Genova Brignole',    lat: 44.4030, lng: 8.9370,  major: false },
  { id: 'SP',   name: 'La Spezia',          lat: 44.1070, lng: 9.8280,  major: false },
  { id: 'SV',   name: 'Savona',             lat: 44.3080, lng: 8.4810,  major: false },
  { id: 'IM',   name: 'Imperia',            lat: 43.8850, lng: 8.0280,  major: false },
  // ── Emilia-Romagna ──
  { id: 'BO',   name: 'Bologna Centrale',   lat: 44.5058, lng: 11.3428, major: true },
  { id: 'PR',   name: 'Parma',              lat: 44.8010, lng: 10.3280, major: false },
  { id: 'RE',   name: 'Reggio Emilia',      lat: 44.7000, lng: 10.6320, major: false },
  { id: 'MO',   name: 'Modena',             lat: 44.6470, lng: 10.9250, major: false },
  { id: 'FE',   name: 'Ferrara',            lat: 44.8370, lng: 11.6200, major: false },
  { id: 'RA',   name: 'Ravenna',            lat: 44.4180, lng: 12.2030, major: false },
  { id: 'RN',   name: 'Rimini',             lat: 44.0670, lng: 12.5640, major: false },
  { id: 'PC',   name: 'Piacenza',           lat: 45.0520, lng: 9.6930,  major: false },
  // ── Toscana ──
  { id: 'FI',   name: 'Firenze S.M.N.',     lat: 43.7764, lng: 11.2484, major: true },
  { id: 'PI',   name: 'Pisa Centrale',      lat: 43.7090, lng: 10.3960, major: false },
  { id: 'LI',   name: 'Livorno Centrale',   lat: 43.5550, lng: 10.3170, major: false },
  { id: 'SI',   name: 'Siena',              lat: 43.3180, lng: 11.3300, major: false },
  { id: 'AR',   name: 'Arezzo',             lat: 43.4630, lng: 11.8790, major: false },
  { id: 'GR',   name: 'Grosseto',           lat: 42.7600, lng: 11.1170, major: false },
  { id: 'LU',   name: 'Lucca',              lat: 43.8430, lng: 10.4950, major: false },
  // ── Umbria / Marche ──
  { id: 'PG',   name: 'Perugia',            lat: 43.1120, lng: 12.3890, major: false },
  { id: 'AN',   name: 'Ancona',             lat: 43.6170, lng: 13.5170, major: false },
  { id: 'PS',   name: 'Pesaro',             lat: 43.9100, lng: 12.9130, major: false },
  // ── Lazio ──
  { id: 'RM',   name: 'Roma Termini',       lat: 41.9010, lng: 12.5015, major: true },
  { id: 'RM_T', name: 'Roma Tiburtina',     lat: 41.9100, lng: 12.5320, major: false },
  { id: 'VT',   name: 'Viterbo P.F.',       lat: 42.4200, lng: 12.1070, major: false },
  { id: 'LT',   name: 'Latina',             lat: 41.4670, lng: 12.9040, major: false },
  { id: 'FR',   name: 'Frosinone',          lat: 41.6380, lng: 13.3360, major: false },
  // ── Abruzzo / Molise ──
  { id: 'AQ',   name: "L'Aquila",           lat: 42.3500, lng: 13.4000, major: false },
  { id: 'PE',   name: 'Pescara Centrale',   lat: 42.4640, lng: 14.2130, major: false },
  { id: 'TE',   name: 'Teramo',             lat: 42.6590, lng: 13.7040, major: false },
  { id: 'CB',   name: 'Campobasso',         lat: 41.5510, lng: 14.6680, major: false },
  // ── Campania ──
  { id: 'NA',   name: 'Napoli Centrale',    lat: 40.8532, lng: 14.2725, major: true },
  { id: 'SA',   name: 'Salerno',            lat: 40.6750, lng: 14.7970, major: false },
  { id: 'CE',   name: 'Caserta',            lat: 41.0720, lng: 14.3260, major: false },
  { id: 'BN',   name: 'Benevento',          lat: 41.1300, lng: 14.7730, major: false },
  // ── Puglia ──
  { id: 'BA',   name: 'Bari Centrale',      lat: 41.1171, lng: 16.8715, major: true },
  { id: 'FG',   name: 'Foggia',             lat: 41.4620, lng: 15.5440, major: false },
  { id: 'LE',   name: 'Lecce',              lat: 40.3530, lng: 18.1750, major: false },
  { id: 'TA',   name: 'Taranto',            lat: 40.4640, lng: 17.2420, major: false },
  { id: 'BR',   name: 'Brindisi',           lat: 40.6320, lng: 17.9450, major: false },
  // ── Basilicata / Calabria ──
  { id: 'PZ',   name: 'Potenza Centrale',   lat: 40.6410, lng: 15.8050, major: false },
  { id: 'MT',   name: 'Matera',             lat: 40.6660, lng: 16.6040, major: false },
  { id: 'CZ',   name: 'Catanzaro',          lat: 38.8360, lng: 16.5960, major: false },
  { id: 'CS',   name: 'Cosenza',            lat: 39.3100, lng: 16.2500, major: false },
  { id: 'RC',   name: 'Reggio Calabria',    lat: 38.1100, lng: 15.6500, major: false },
  { id: 'VV',   name: 'Vibo Valentia',      lat: 38.6750, lng: 16.1000, major: false },
  // ── Sicilia ──
  { id: 'PA',   name: 'Palermo Centrale',   lat: 38.1057, lng: 13.3620, major: true },
  { id: 'CT',   name: 'Catania Centrale',   lat: 37.5079, lng: 15.0934, major: true },
  { id: 'ME',   name: 'Messina Centrale',   lat: 38.1930, lng: 15.5530, major: false },
  { id: 'SR',   name: 'Siracusa',           lat: 37.0640, lng: 15.2800, major: false },
  { id: 'TP',   name: 'Trapani',            lat: 38.0170, lng: 12.5370, major: false },
  { id: 'AG',   name: 'Agrigento',          lat: 37.3110, lng: 13.5760, major: false },
  // ── Sardegna ──
  { id: 'CA',   name: 'Cagliari',           lat: 39.2169, lng: 9.1399,  major: true },
  { id: 'SS',   name: 'Sassari',            lat: 40.7260, lng: 8.5560,  major: false },
  { id: 'NU',   name: 'Nuoro',              lat: 40.3200, lng: 9.3300,  major: false },
  { id: 'OR',   name: 'Oristano',           lat: 39.9060, lng: 8.5880,  major: false },
];

// ── Direct rail connections (edges) ────────────────────────────────────
// Each pair [a, b] means a direct rail segment exists.
export const CONNECTIONS = [
  // ── NW corridor ──
  ['TO', 'TO_P'], ['TO_P', 'NO'], ['NO', 'MI'], ['MI', 'MI_P'],
  ['TO', 'AL'], ['AL', 'GE'], ['GE', 'GE_B'], ['GE_B', 'SV'], ['SV', 'IM'],
  ['AL', 'PV'], ['PV', 'MI'], ['TO', 'CN'], ['TO_P', 'BI'],
  // ── Milan hub ──
  ['MI', 'BG'], ['MI', 'CO'], ['MI', 'BS'], ['MI', 'CR'], ['MI', 'MN'],
  ['MI', 'PC'], ['BS', 'VR'], ['BG', 'BS'], ['SO', 'MI'],
  // ── NE corridor ──
  ['VR', 'VI'], ['VI', 'PD'], ['PD', 'VE_M'], ['VE_M', 'VE'],
  ['VR', 'TN'], ['TN', 'BZ'], ['PD', 'TV'], ['TV', 'UD'], ['UD', 'TS'],
  ['VE_M', 'RO'], ['RO', 'FE'],
  // ── Emilia spine ──
  ['PC', 'PR'], ['PR', 'RE'], ['RE', 'MO'], ['MO', 'BO'],
  ['BO', 'FE'], ['BO', 'RA'], ['RA', 'RN'], ['RN', 'PS'],
  // ── Tyrrhenian spine ──
  ['GE_B', 'SP'], ['SP', 'PI'], ['PI', 'LI'], ['PI', 'LU'], ['LU', 'FI'],
  ['FI', 'AR'], ['AR', 'RM'], ['RM', 'LT'], ['LT', 'NA'],
  ['LI', 'GR'], ['GR', 'RM'],
  // ── Central ──
  ['FI', 'BO'], ['FI', 'SI'], ['SI', 'GR'], ['RM', 'VT'],
  ['RM', 'FR'], ['RM', 'AQ'], ['AQ', 'PE'], ['PE', 'TE'],
  ['PS', 'AN'], ['AN', 'PE'], ['RM_T', 'RM'],
  // ── South ──
  ['NA', 'CE'], ['CE', 'BN'], ['NA', 'SA'], ['SA', 'PZ'],
  ['PZ', 'MT'], ['SA', 'CS'], ['CS', 'CZ'], ['CZ', 'VV'], ['VV', 'RC'],
  ['NA', 'FG'], ['FG', 'BA'], ['BA', 'BR'], ['BR', 'LE'], ['BA', 'TA'],
  ['FG', 'CB'], ['CB', 'PZ'],
  // ── Sicilia ──
  ['ME', 'CT'], ['CT', 'SR'], ['PA', 'ME'], ['PA', 'AG'], ['AG', 'CT'],
  ['TP', 'PA'],
  // ── Sardegna ──
  ['CA', 'OR'], ['OR', 'SS'], ['CA', 'NU'], ['NU', 'SS'],
];

export const stationById = new Map(STATIONS.map(s => [s.id, s]));
