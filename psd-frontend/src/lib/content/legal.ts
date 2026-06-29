export type LegalDocument = {
  slug: string
  title: string
  description: string
  content: string
}

const legalDisclaimer = `> **Catatan:** Dokumen ini adalah kerangka awal dan **bukan** teks hukum final. Wajib ditinjau penasihat hukum agar patuh UU PDP No. 27/2022 dan UU ITE sebelum peluncuran produksi.

`

export const legalDocuments: LegalDocument[] = [
  {
    slug: 'ketentuan-layanan',
    title: 'Ketentuan Layanan',
    description: 'Syarat penggunaan platform Projek Sains Data.',
    content: `${legalDisclaimer}# Ketentuan Layanan

Terakhir diperbarui: 28 Juni 2026 (versi 2026-07)

## 1. Ruang lingkup layanan

Projek Sains Data (PSD) menyediakan platform kolaboratif untuk membagikan dan menemukan proyek, dataset, model, notebook, kompetisi, kursus, forum, feed sosial, jejaring komunitas, ruang ide, pabrik data, analitik, registry model, gamifikasi, dan konten komunitas terkait sains data di Indonesia.

Layanan terintegrasi dapat mencakup Git hosting (Gitea), workspace notebook (browser atau kernel server), JupyterHub, dan alat analitik pihak ketiga yang diakses melalui autentikasi tunggal PSD.

## 2. Akun & keamanan

Anda bertanggung jawab menjaga kerahasiaan kredensial akun. Aktivitas yang dilakukan melalui akun Anda dianggap sebagai tindakan Anda, kecuali Anda memberitahu kami adanya penyalahgunaan.

## 3. Kewajiban & larangan pengguna

Dilarang:

- Melanggar hukum Indonesia atau hak pihak ketiga
- Mengunggah data pribadi tanpa dasar hukum yang sah
- Menyebarkan malware, spam, atau konten yang menyesatkan
- Mengganggu keamanan, kuota, atau ketersediaan layanan (termasuk penyalahgunaan kernel notebook, pipeline data, atau API)
- Menyalahgunakan fitur sosial (follow, engagement, feed) untuk manipulasi atau spam

## 4. Konten & lisensi

Anda tetap memegang hak atas konten yang Anda unggah. Dengan mempublikasikan konten di PSD, Anda memberikan lisensi non-eksklusif kepada PSD untuk menampilkan, mendistribusikan, mengindeks, dan mempromosikan konten tersebut dalam platform.

Konten sintesis yang dihasilkan platform wajib mematuhi pedoman komunitas dan tidak boleh digunakan untuk tujuan ilegal.

## 5. Git, notebook, & layanan terintegrasi

- Kunci SSH yang Anda daftarkan di PSD dikelola pada Git PSD (Gitea) untuk push/clone repository.
- Notebook dan kernel server tunduk pada kuota tier akun Anda; PSD dapat membatasi atau menangguhkan akses jika kuota dilampaui atau terjadi penyalahgunaan.
- Penggunaan JupyterHub, Superset, atau layanan terhubung lainnya tunduk pada ketentuan layanan masing-masing penyedia serta kebijakan PSD.

## 6. Gamifikasi, komunitas, & engagement

Reputasi, badge, peringkat, dan statistik engagement (suka, unduhan, tayangan) bersifat indikatif dan dapat disesuaikan untuk menjaga integritas komunitas. PSD berhak membatalkan poin atau interaksi yang terbukti manipulatif.

## 7. Moderasi & penangguhan akun

PSD berhak menghapus konten atau menangguhan akun yang melanggar ketentuan, [Pedoman komunitas](/help/pedoman-komunitas), atau peraturan perundang-undangan.

## 8. Penafian & batasan tanggung jawab

Layanan disediakan "sebagaimana adanya". PSD tidak menjamin keakuratan konten pengguna, hasil model, atau dataset pihak ketiga, dan tidak bertanggung jawab atas kerugian tidak langsung akibat penggunaan platform.

## 9. Perubahan ketentuan

Kami dapat memperbarui ketentuan ini. Versi terbaru diumumkan di halaman ini dengan nomor versi (mis. \`2026-07\`). Jika versi yang Anda terima berbeda dari versi terbaru, Anda akan diminta menyetujui ulang sebelum melanjutkan penggunaan tertentu.

## 10. Hukum yang berlaku

Ketentuan ini tunduk pada hukum Republik Indonesia.

Lihat juga [Kebijakan Privasi](/legal/kebijakan-privasi) dan [Pedoman komunitas](/help/pedoman-komunitas).`,
  },
  {
    slug: 'kebijakan-privasi',
    title: 'Kebijakan Privasi',
    description: 'Cara PSD mengumpulkan, memproses, dan melindungi data Anda.',
    content: `${legalDisclaimer}# Kebijakan Privasi

Terakhir diperbarui: 28 Juni 2026 (versi 2026-07)

## 1. Data yang dikumpulkan

- **Data akun:** nama, username, email, kata sandi (hash), profil (banner, bio, minat, tautan), preferensi tampilan & notifikasi
- **Konten:** proyek, dataset, model, notebook, postingan feed, komentar, diskusi forum, submission kompetisi, notebook, pipeline data
- **Sosial & komunitas:** relasi follow/following, interaksi engagement (suka, bagikan, unduh, tayangan), aktivitas discovery
- **Git & teknis:** kunci SSH publik (bukan kunci privat), metadata repository, log akses API, alamat IP, cookie sesi autentikasi (httpOnly)
- **Pelacakan aktivitas (opsional):** ringkasan minat dan interaksi di platform jika Anda mengaktifkannya di pengaturan privasi
- **Notebook & kernel:** metadata sesi, kuota pemakaian CPU/RAM, log eksekusi terbatas untuk keamanan operasional

Kami **tidak** menyimpan kunci privat SSH Anda — hanya kunci **publik** yang Anda tempelkan di pengaturan Git.

## 2. Dasar & tujuan pemrosesan

Data diproses untuk:

- Menyediakan dan mengamankan layanan
- Autentikasi tunggal ke Git PSD, JupyterHub, dan layanan terintegrasi
- Moderasi, pencegahan penyalahgunaan, dan dukungan pengguna
- Analitik operasional, personalisasi (jika diaktifkan), dan peningkatan produk
- Komunikasi terkait layanan (verifikasi email, notifikasi)

Pemrosesan dilakukan sesuai UU PDP No. 27/2022.

## 3. Penyimpanan & lokasi data

Data disimpan pada infrastruktur yang dikelola PSD dan/atau penyedia layanan pihak ketiga (hosting, email, penyimpanan objek, mesin pencari) yang terikat perjanjian pemrosesan data.

## 4. Berbagi dengan pihak ketiga

Kami dapat membagikan data kepada:

- Penyedia infrastruktur (hosting, CDN, email, MinIO/S3, Meilisearch)
- Layanan terintegrasi yang Anda akses melalui akun PSD (Gitea, JupyterHub, Superset) sejauh diperlukan untuk autentikasi dan operasional
- Otoritas apabila diwajibkan oleh hukum

Kami tidak menjual data pribadi Anda.

## 5. Profil, privasi, & penemuan

Anda dapat mengatur visibilitas profil dan preferensi penemuan di **Pengaturan → Privasi**. Profil privat membatasi siapa yang dapat melihat portofolio dan statistik Anda.

## 6. Hak subjek data

Sesuai UU PDP, Anda berhak meminta akses, koreksi, dan penghapusan data pribadi tertentu melalui pengaturan akun atau kontak di bawah.

## 7. Keamanan

Kami menerapkan kontrol teknis dan organisasi wajar, termasuk enkripsi transport (HTTPS), cookie httpOnly, pembatasan akses admin, dan pemantauan keamanan.

## 8. Cookie & pelacakan

- **Cookie sesi (wajib):** autentikasi httpOnly agar Anda tetap masuk
- **Preferensi tampilan:** tema terang/gelap disimpan di perangkat Anda (localStorage)
- **Pelacakan aktivitas (opsional):** dapat dimatikan di pengaturan privasi; saat dimatikan, event analitik tidak dikirim

## 9. Retensi

Data akun dipertahankan selama akun aktif. Log teknis dan data analitik dapat dihapus atau dianonimkan setelah periode retensi operasional yang wajar.

## 10. Perubahan kebijakan

Kebijakan ini dapat diperbarui. Versi terbaru ditampilkan di halaman ini. Perubahan material dapat meminta persetujuan ulang melalui banner di aplikasi.

## 11. Kontak Pengendali Data

Email: privasi@projeksainsdata.id

Lihat juga [Ketentuan Layanan](/legal/ketentuan-layanan).`,
  },
]

export function getLegalDocument(slug: string) {
  return legalDocuments.find((d) => d.slug === slug)
}
