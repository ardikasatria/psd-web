# Brief Agen Cursor — Editor Notebook Sel (gaya Kaggle)

> **Pelengkap Langkah 52b (Opsi B — UI kustom).** Membangun editor notebook sel di dalam PSD:
> tambah/jalankan/hapus sel, output inline, status kernel, autosave ke PSD.
>
> **Cara pakai:** lampirkan ke agen Cursor, mulai dengan:
> *"Kerjakan editor notebook sesuai brief. Mulai dari Langkah 0 — Orientasi repo & adaptasi ke
> sistem desain + state management PSD, lalu sambungkan runtime & persistensi nyata."*
>
> Logika inti (model sel + serialisasi ipynb) **lulus 9 uji** di `frontend/src/notebookModel.test.js`.

---

## 1. Tujuan

Editor notebook **di dalam PSD** (tanpa UI JupyterHub) yang terasa seperti Kaggle: sel kode & teks,
jalankan per-sel / semua, output inline, indikator kernel, dan **PSD sebagai sumber kebenaran** (autosave).

Runtime ditentukan Langkah 52b (hybrid): **browser (Pyodide)** untuk tier rendah, **server (WS kernel)**
untuk tier tinggi. Editor ini **runtime-agnostik** — memanggil satu antarmuka kernel.

---

## 2. Komponen referensi (di `frontend/src/`)

| Berkas | Peran | Status |
|---|---|---|
| `notebookModel.js` | Model murni: cell CRUD, reorder, ipynb (de)serialisasi | **9 uji ✓** |
| `NotebookEditor.jsx` | Komponen utama: state, run, autosave | skeleton |
| `Cell.jsx` | Sel tunggal (code/markdown), editor, output | skeleton |
| `Outputs.jsx` | Render output (stream/result/html/gambar/error) | skeleton |
| `Toolbar.jsx` | Run all, tambah sel, restart, status, simpan | skeleton |
| `kernels/kernelInterface.js` | Kontrak kernel + mock untuk dev UI | referensi |
| `kernels/pyodideKernel.js` | Kernel browser (Pyodide) | referensi |
| `kernels/serverKernel.js` | Kernel server (WebSocket Jupyter) | referensi |
| `persistence.js` | Muat + autosave ipynb ke API PSD | referensi |
| `editor.css` | Gaya dasar (variabel CSS, themable) | referensi |

---

## 3. Langkah 0 — Orientasi repo (WAJIB)

- [ ] **Sistem desain PSD** (komponen, token warna/tipografi) → terapkan ke editor (ganti `editor.css`
      netral; set `--nb-accent` ke aksen PSD). Editor = permukaan utama, jadikan rapi & konsisten.
- [ ] **State management** PSD (Redux/Zustand/Context?) → integrasikan state notebook.
- [ ] **Editor kode**: textarea cukup untuk awal; pertimbangkan **CodeMirror 6/Monaco** untuk sintaks
      Python (sorot, indentasi). Ganti `<textarea>` di `Cell.jsx`.
- [ ] **Render markdown**: pakai pustaka markdown PSD (mis. markdown-it/react-markdown) di `Cell.jsx`
      (skeleton menampilkan teks mentah).
- [ ] **Endpoint** `GET/PUT /api/notebooks/{id}/content` (persistensi) sudah ada (Langkah 52b)?
- [ ] **Runtime**: dari `service.launch` (52b) — browser config vs kernel server (id + WS).

**Pertanyaan untuk manусia:**
1. Editor kode: CodeMirror, Monaco, atau textarea dulu?
2. Sistem desain/komponen yang harus dipakai?
3. Keyboard shortcut wajib (Shift+Enter jalankan, dll.)?

---

## 4. Sub-langkah

### E.1 — Pasang model & komponen
- Cermin `notebookModel.js` (jangan ubah logika; sudah teruji). Pasang `NotebookEditor/Cell/Outputs/Toolbar`.
- Terapkan sistem desain PSD; jaga aksesibilitas (fokus keyboard terlihat, `prefers-reduced-motion`).

### E.2 — Sambungkan runtime kernel (hybrid)
- Implementasikan antarmuka kernel (`kernelInterface.js`) untuk dua runtime:
  - **browser**: `pyodideKernel.js` — muat Pyodide, suntik `psd` (SDK psd-lite), tangkap stdout/hasil/error.
  - **server**: `serverKernel.js` — WS `/api/kernels/{id}/channels`; untuk produksi pertimbangkan
    `@jupyterlab/services`. Lifecycle (interrupt/restart) lewat REST (`kernels.py`, 52b).
- Pilih runtime dari `service.launch` (52b). Editor tinggal menerima `kernel` sebagai prop.

### E.3 — Persistensi ke PSD
- Cermin `persistence.js`. Muat ipynb saat buka; autosave (debounce) saat berubah. **Jangan** andalkan
  IndexedDB browser sebagai sumber kebenaran.

### E.4 — Integrasi kuota (gamifikasi)
- "Notebook Baru" lewat `POST /api/notebooks` (gated `create_notebook`, 52b).
- Untuk runtime server, start kernel gated kuota kernel konkuren (`start_kernel_gated`, 52b).
- Tampilkan sisa kuota/tier bila relevan (modul gamifikasi terpusat).

### E.5 — Keyboard & UX
- Shift+Enter: jalankan sel & pindah; Ctrl/Cmd+Enter: jalankan di tempat; tombol tambah sel di antara sel.
- Status simpan jelas ("Tersimpan" / "Menyimpan…" / "Gagal menyimpan — coba lagi").

---

## 5. Antarmuka kernel (kontrak)

```
status: 'starting' | 'idle' | 'busy' | 'dead'
async execute(code) -> { outputs: NbOutput[], execution_count: number }
async interrupt()
async restart()
onStatus(cb) -> unsubscribe
```
`NbOutput` mengikuti nbformat (`stream` / `execute_result` / `display_data` / `error`).
`Outputs.jsx` sudah menangani keempatnya.

---

## 6. Definition of Done

- [ ] Pengguna membuat, menyunting, menjalankan (per-sel & semua) notebook di dalam PSD.
- [ ] Output (teks/HTML/gambar/error) tampil inline; status kernel terlihat.
- [ ] **Autosave ke API PSD** bekerja (PSD sumber kebenaran); muat ulang mempertahankan isi.
- [ ] Runtime browser & server keduanya jalan lewat antarmuka kernel yang sama.
- [ ] Kuota dihormati (buat notebook & kernel konkuren) — modul 52b/gamifikasi.
- [ ] Editor memakai sistem desain PSD; aksesibel (fokus, kontras, reduced-motion).
- [ ] `node --test frontend/src/notebookModel.test.js` hijau (9 uji) setelah adaptasi.

---

## 7. Non-goals

- Kolaborasi real-time multi-kursor (menyusul).
- Widget interaktif Jupyter penuh (ipywidgets) — bertahap.
- Variable inspector / debugger — fase berikut.

---

## 8. Gotcha

- **Model teruji — jangan ubah logikanya** tanpa memperbarui uji; bug serialisasi ipynb mahal.
- **`psd.load` di browser async** (`await`); pastikan sel mendukung `await` top-level (Pyodide
  `runPythonAsync` mendukung).
- **Output error berisi ANSI**; `Outputs.jsx` sudah menyaringnya — pertahankan.
- **Autosave debounce + flush saat tutup/blur** agar perubahan terakhir tak hilang.
- **PSD = sumber kebenaran**, bukan IndexedDB; selalu muat dari & simpan ke API PSD.
- **Sanitasi HTML output** bila menampilkan `text/html` dari hasil eksekusi (cegah XSS) — skeleton memakai
  `dangerouslySetInnerHTML`; tambahkan sanitizer (mis. DOMPurify) di produksi.

---

## 9. Referensi terverifikasi

`frontend/src/notebookModel.test.js` **lulus 9 uji** (cell CRUD, reorder + batas, ganti tipe mengosongkan
output, set sumber, toSource/fromSource multiline round-trip, ipynb round-trip mempertahankan sumber & tipe,
markdown tanpa execution_count/outputs, bentuk ipynb dasar). Komponen React & runtime adapter = skeleton
untuk diadaptasi ke sistem desain, state, dan endpoint PSD.
