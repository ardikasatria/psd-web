export const INTERESTS = [
  { id: 'nlp', label: 'NLP / Bahasa' },
  { id: 'cv', label: 'Computer Vision' },
  { id: 'tabular', label: 'ML Tabular' },
  { id: 'forecasting', label: 'Forecasting' },
  { id: 'mlops', label: 'MLOps' },
  { id: 'sdgs', label: 'SDGs' },
  { id: 'umkm', label: 'UMKM' },
  { id: 'kebencanaan', label: 'Kebencanaan' },
  { id: 'kesehatan', label: 'Kesehatan' },
  { id: 'pertanian', label: 'Pertanian' },
  { id: 'data-publik', label: 'Data Publik' },
  { id: 'bahasa-daerah', label: 'Bahasa Daerah' },
] as const

export type InterestId = (typeof INTERESTS)[number]['id']
