# PSD — Instruksi Cursor: Editor Notebook Menyambung Kernel JupyterHub (UI Tetap di PSD)

> **Cara pakai:** Lampirkan bersama editor notebook (NOTEBOOK_EDITOR_BRIEF). Mengubah **runtime server**
> agar editor PSD bicara ke **single-user server JupyterHub** pengguna (auth OAuth2/OIDC PSD), sambil UI
> tetap di PSD. **Kerjakan setelah editor notebook & runtime hybrid (52b).** Prasyarat: backend Langkah 52 (revisi).

## 1. Yang berubah

- Editor sel, toolbar, output, autosave **tidak berubah** (tetap UI PSD).
- **Runtime server** kini memakai config dari backend yang menunjuk ke **Hub**:
  `{ provider:"jupyterhub", base_url, kernels_url, ws_base, token, expires_in }`.
- `serverKernel.js` (kernel server) memakai `base_url`/`ws_base` + **token ber-scope** dari Hub.

## 2. Skema & API

```ts
export const ServerRuntimeSchema = z.object({
  runtime: z.literal("server"), provider: z.literal("jupyterhub"),
  base_url: z.string(), kernels_url: z.string(), ws_base: z.string(),
  token: z.string(), expires_in: z.number(),
});
export const BrowserRuntimeSchema = z.object({ runtime: z.literal("browser"), config: z.any() });
export const LaunchSchema = z.union([ServerRuntimeSchema, BrowserRuntimeSchema]);

// lib/api/notebook.ts
export const launchNotebook = (id: string, runtime?: "browser" | "server") =>
  apiFetch(`/notebooks/${id}/launch`, LaunchSchema, { method: "POST", body: JSON.stringify({ runtime }) });
export const stopRuntime = (id: string) => apiFetch(`/notebooks/${id}/stop`, z.any(), { method: "POST" });
export const runtimeStatus = () => apiFetch(`/notebooks/runtime/status`, z.object({ ready: z.boolean(), pending: z.string().nullable() }));
```

## 3. Alur membuka kernel server

1. Pengguna pilih runtime **Server** (hanya bila punya grant akses kernel, Langkah 26 — jika tidak,
   tampilkan ajakan "Minta akses kernel").
2. `launchNotebook(id, "server")`:
   - **403 `kernel_access_required`** → tampilkan ajakan minta akses.
   - **429 `kernel_limit`** → tampilkan "batas kernel tercapai".
   - sukses (`provider:"jupyterhub"`) → simpan `{base_url, ws_base, token}`.
3. **State "Menyiapkan server…"**: spawn Hub tak instan. Tampilkan loading sampai backend mengembalikan
   config siap (backend sudah `ensure_server`). Bila timeout (504) → tombol coba lagi.
4. Buat `serverKernel` dari config:
   ```js
   createServerKernel({ wsBase: cfg.ws_base, kernelId, token: cfg.token }); // /api/kernels/{id}/channels?token=
   ```
   REST lifecycle (start/interrupt/restart/shutdown) → `cfg.kernels_url` dengan header `Authorization: token <cfg.token>`.
5. Jalankan sel via WS seperti biasa (editor tak berubah).

## 4. Token & keamanan (frontend)

- Token dari backend **ber-scope ke server pengguna & berumur pendek** (`expires_in`). **Jangan**
  simpan permanen; minta ulang `launchNotebook` saat kedaluwarsa atau saat membuka kembali.
- Jangan pernah menampilkan/menyimpan token admin Hub (frontend tak pernah menerimanya).

## 5. Berhenti & status

- Tombol **Hentikan server** → `stopRuntime(id)`.
- Indikator status kernel tetap dari `serverKernel` (idle/busy). Opsional poll `runtimeStatus` saat menyiapkan.

## 6. Handler MSW

Tambah handler: `launchNotebook` (browser; server sukses dengan token+URL Hub; 403 kernel_access_required;
429 kernel_limit; 504 saat menyiapkan), `stopRuntime`, `runtimeStatus` (pending→ready).

## 7. Definition of Done

- [ ] Runtime server membuka **kernel JupyterHub** pengguna; UI tetap editor PSD.
- [ ] Token Hub ber-scope & berumur pendek dipakai untuk REST + WS; diperbarui saat kedaluwarsa.
- [ ] State "Menyiapkan server" saat spawn; timeout → coba lagi.
- [ ] Tanpa grant → ajakan minta akses; batas konkuren → pesan jelas.
- [ ] Runtime browser (JupyterLite) tetap berfungsi tanpa perubahan.
- [ ] Mode mock berfungsi; flip ke backend nyata tanpa ubah komponen.
