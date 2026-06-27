import type { NotebookDetail, NotebookSummary } from '@/types/api'
import { previewColabUrl } from '@/lib/notebooks/colab'
import { owners } from './users'

export type MockNotebookRecord = NotebookSummary & {
  description: string
  source_url: string | null
  owner_id: string
}

export const notebookRecords: MockNotebookRecord[] = [
  {
    id: 'nb_transformer_01',
    title: 'Fine-tuning IndoBERT dengan Resource Terbatas',
    owner: { ...owners.psd, is_official: true },
    tags: ['nlp', 'transformer', 'fine-tuning'],
    description:
      'Notebook referensi fine-tuning IndoBERT untuk klasifikasi sentimen — optimasi batch size, gradient accumulation, dan evaluasi dengan dataset lokal.',
    source_url: 'https://colab.research.google.com/github/example/indobert-finetune.ipynb',
    owner_id: 'usr_psd',
    category: { slug: 'transformer', name: 'Transformer' },
    subcategory: null,
  },
  {
    title: 'Eksplorasi Dataset Ulasan Marketplace',
    owner: owners.budi,
    tags: ['nlp', 'eda'],
    description: 'Notebook eksplorasi dataset ulasan marketplace Indonesia — latihan cleaning teks, visualisasi distribusi rating, dan feature awal untuk klasifikasi sentimen.',
    source_url: null,
    owner_id: 'usr_01',
    category: { slug: 'nlp', name: 'NLP & Bahasa' },
    subcategory: { slug: 'sentimen', name: 'Sentimen' },
  },
  {
    id: 'nb_02',
    title: 'Tutorial Klasifikasi Gambar (TensorFlow)',
    owner: { ...owners.psd, is_official: true },
    tags: ['tutorial', 'cv'],
    description: 'Notebook resmi PSD — klasifikasi gambar dengan TensorFlow/Keras. Buka langsung di Colab, fork, dan modifikasi arsitektur CNN.',
    source_url: 'https://github.com/tensorflow/docs/blob/master/site/en/tutorials/keras/classification.ipynb',
    owner_id: 'usr_psd',
    category: { slug: 'cv', name: 'Computer Vision' },
    subcategory: null,
  },
  {
    id: 'nb_03',
    title: 'Analisis Survei Digital UMKM',
    owner: { ...owners.psd, is_official: true },
    tags: ['survei', 'umkm'],
    description: 'Analisis survei digital UMKM dengan scikit-learn — clustering dan interpretasi segmen pelanggan.',
    source_url: 'https://github.com/scikit-learn/scikit-learn/blob/main/notebooks/cluster/plot_kmeans_assumptions.ipynb',
    owner_id: 'usr_psd',
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: null,
  },
  {
    id: 'nb_04',
    title: 'CNN untuk Deteksi Penyakit Padi',
    owner: owners.siti,
    tags: ['cv', 'pertanian'],
    description: 'Eksperimen CNN untuk deteksi penyakit padi dari citra daun — pipeline augmentasi dan evaluasi confusion matrix.',
    source_url: 'https://example.com/notebooks/cnn-padi.ipynb',
    owner_id: 'usr_02',
    category: { slug: 'cv', name: 'Computer Vision' },
    subcategory: null,
  },
  {
    id: 'nb_05',
    title: 'Forecasting dengan LSTM',
    owner: owners.budi,
    tags: ['forecasting', 'lstm', 'tabular'],
    description: 'Notebook forecasting deret waktu dengan LSTM — split train/val, normalisasi, dan baseline perbandingan.',
    source_url: 'https://gist.githubusercontent.com/example/forecast-lstm.ipynb',
    owner_id: 'usr_01',
    category: { slug: 'data', name: 'Data Scientist' },
    subcategory: null,
  },
  {
    id: 'nb_06',
    title: 'Feature Engineering Tabular',
    owner: owners.budi,
    tags: ['tabular', 'ml'],
    description: 'Teknik feature engineering untuk data tabular — encoding, scaling, dan seleksi fitur sebelum modeling kompetisi.',
    source_url: null,
    owner_id: 'usr_01',
    category: { slug: 'data', name: 'Data Scientist' },
    subcategory: null,
  },
  {
    id: 'nb_07',
    title: 'Baseline Kompetisi Tabular PSD',
    owner: { ...owners.psd, is_official: true },
    tags: ['tutorial', 'tabular', 'kompetisi'],
    description: 'Template baseline untuk kompetisi tabular — EDA cepat, validasi silang, dan submission format PSD.',
    source_url: 'https://github.com/googlecolab/colabtools/blob/master/notebooks/Welcome_To_Colaboratory.ipynb',
    owner_id: 'usr_psd',
    category: { slug: 'data', name: 'Data Scientist' },
    subcategory: null,
  },
]

export function notebookSummaryOf(record: MockNotebookRecord): NotebookSummary {
  const desc = record.description.replace(/\s+/g, ' ').trim()
  return {
    id: record.id,
    title: record.title,
    owner: record.owner,
    tags: record.tags,
    category: record.category,
    subcategory: record.subcategory,
    team: record.team,
    description_preview: desc.length > 100 ? `${desc.slice(0, 97)}…` : desc,
    has_colab: !!previewColabUrl(record.source_url ?? ''),
  }
}

export const notebooks: NotebookSummary[] = notebookRecords.map(notebookSummaryOf)

export function notebookDetailOf(record: MockNotebookRecord): NotebookDetail {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    tags: record.tags,
    owner: record.owner,
    source_url: record.source_url,
    colab_url: previewColabUrl(record.source_url ?? ''),
    category: record.category,
    subcategory: record.subcategory,
    team: record.team ?? null,
  }
}

export function findNotebook(id: string): MockNotebookRecord | undefined {
  return notebookRecords.find((n) => n.id === id)
}
