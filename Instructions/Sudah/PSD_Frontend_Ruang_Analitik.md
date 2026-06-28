# PSD — Instruksi Cursor: Ruang Analitik (Dashboard) — Frontend

> **Cara pakai:** Lampirkan bersama dokumen frontend. Dashboard native: render widget chart dari gold, builder widget, layout, publish. **Kerjakan setelah backend Langkah 46 & Eksekusi (Langkah 45).**

## 1. Pustaka chart

Gunakan **ECharts** (`echarts-for-react`) atau Plotly — konsisten satu pustaka. Contoh di bawah memakai komponen pembungkus `<Chart kind options data />`.

## 2. Skema & API

```ts
export const WidgetSchema = z.object({ id: z.string(), kind: z.enum(["kpi","table","line","bar","pie","scatter"]),
  title: z.string(), query: z.record(z.any()), options: z.record(z.any()) });
export const DashboardSchema = z.object({ slug: z.string(), title: z.string(), description_md: z.string(),
  visibility: z.enum(["private","public"]), layout: z.array(z.any()), pipeline_id: z.string().nullable(),
  widgets: z.array(WidgetSchema) });

// lib/api/dashboards.ts
export const createDashboard = (b: any) => apiFetch(`/dashboards`, z.object({ slug: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const listDashboards = () => apiFetch(`/dashboards`, PaginatedDashboard);
export const getDashboard = (slug: string) => apiFetch(`/dashboards/${slug}`, DashboardSchema);
export const updateDashboard = (slug: string, b: any) => apiFetch(`/dashboards/${slug}`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const addWidget = (slug: string, b: any) => apiFetch(`/dashboards/${slug}/widgets`, z.object({ id: z.string() }), { method: "POST", body: JSON.stringify(b) });
export const updateWidget = (slug: string, wid: string, b: any) => apiFetch(`/dashboards/${slug}/widgets/${wid}`, z.any(), { method: "PATCH", body: JSON.stringify(b) });
export const deleteWidget = (slug: string, wid: string) => apiFetch(`/dashboards/${slug}/widgets/${wid}`, z.any(), { method: "DELETE" });
export const getWidgetData = (slug: string, wid: string) => apiFetch(`/dashboards/${slug}/widgets/${wid}/data`, z.any());
```

## 3. Daftar & buat — `/analytics`

- Grid dashboard (`listDashboards`): judul + badge visibilitas.
- **Dashboard baru**: judul + pilih **pipeline** (opsional, sumber data gold) + tim/room opsional → `createDashboard`.

## 4. Tampilan dashboard — `/analytics/[slug]`

- Header: judul, deskripsi, badge visibilitas. Tombol **Bagikan** (toggle publik/privat via `updateDashboard`).
- **Grid widget** (react-grid-layout opsional untuk drag/resize; simpan ke `layout` via `updateDashboard`).
- Tiap widget memuat datanya sendiri (`getWidgetData`) lalu render sesuai `kind`:
  - **kpi** → angka besar + judul.
  - **table** → tabel `rows`.
  - **line/bar/scatter** → chart dari `points` (x,y).
  - **pie** → chart dari `slices` (label,value).
  - `{empty:true}` → placeholder "Jalankan pipeline dulu untuk mengisi data."

## 5. Builder widget (editor)

Bila pengguna editor (pemilik/anggota tim):
- Tombol **Tambah widget**: pilih **jenis**, **judul**, lalu **query**:
  - pilih **node gold** (dari pipeline dashboard; tampilkan daftar node gold dari run terbaru),
  - pilih kolom sesuai jenis (kpi: y+agg; table: columns; line/bar: x,y,agg?; pie: label,value,agg?; scatter: x,y), limit.
- `addWidget` lalu render. Sunting/hapus widget.
- Tampilkan label **Data Sintesis** bila pipeline bersumber data sintesis.

## 6. Handler MSW

Tambah handler dashboards (CRUD), widgets (CRUD), dan widget data (kembalikan contoh tiap jenis + skenario `{empty:true}`). Sediakan dashboard publik & privat.

## 7. Definition of Done

- [ ] Dashboard dibuat dengan pipeline; widget enam jenis render dari data gold.
- [ ] Builder widget memilih node gold + kolom; simpan & render.
- [ ] Toggle publik/privat; privat tertutup untuk non-anggota.
- [ ] Placeholder rapi saat belum ada run gold.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
