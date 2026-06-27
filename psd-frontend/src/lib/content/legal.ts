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

Terakhir diperbarui: Juni 2026

## 1. Ruang lingkup layanan

Projek Sains Data (PSD) menyediakan platform kolaboratif untuk membagikan dan menemukan proyek, dataset, model, kompetisi, kursus, forum, dan konten komunitas terkait sains data di Indonesia.

## 2. Kewajiban & larangan pengguna

Anda bertanggung jawab atas akun dan konten yang Anda unggah. Dilarang:

- Melanggar hukum Indonesia atau hak pihak ketiga
- Mengunggah data pribadi tanpa dasar hukum yang sah
- Menyebarkan malware, spam, atau konten yang menyesatkan
- Mengganggu keamanan atau ketersediaan layanan

## 3. Hak kekayaan intelektual & lisensi konten

Anda tetap memegang hak atas konten yang Anda unggah. Dengan mempublikasikan konten di PSD, Anda memberikan lisensi non-eksklusif kepada PSD untuk menampilkan, mendistribusikan, dan mengindeks konten tersebut dalam platform.

## 4. Moderasi & penangguhan akun

PSD berhak menghapus konten atau menangguhkan akun yang melanggar ketentuan, pedoman komunitas, atau peraturan perundang-undangan.

## 5. Penafian & batasan tanggung jawab

Layanan disediakan "sebagaimana adanya". PSD tidak menjamin keakuratan konten pengguna dan tidak bertanggung jawab atas kerugian tidak langsung akibat penggunaan platform.

## 6. Perubahan ketentuan

Kami dapat memperbarui ketentuan ini. Versi terbaru akan diumumkan di halaman ini. Penggunaan berkelanjutan setelah perubahan dianggap sebagai persetujuan.

## 7. Hukum yang berlaku

Ketentuan ini tunduk pada hukum Republik Indonesia.

Lihat juga [Kebijakan Privasi](/legal/kebijakan-privasi) dan [Pedoman komunitas](/help/pedoman-komunitas).`,
  },
  {
    slug: 'kebijakan-privasi',
    title: 'Kebijakan Privasi',
    description: 'Cara PSD mengumpulkan, memproses, dan melindungi data Anda.',
    content: `${legalDisclaimer}# Kebijakan Privasi

Terakhir diperbarui: Juni 2026

## 1. Data yang dikumpulkan

- **Data akun:** nama, username, email, kata sandi (hash), profil, preferensi
- **Konten:** proyek, dataset, model, postingan, komentar, submission kompetisi
- **Data teknis:** log akses, alamat IP, cookie sesi autentikasi (httpOnly)

## 2. Dasar & tujuan pemrosesan

Data diproses untuk menyediakan layanan, keamanan akun, moderasi, analitik operasional, dan komunikasi terkait layanan sesuai UU PDP.

## 3. Penyimpanan & lokasi data

Data disimpan pada infrastruktur yang dikelola PSD dan/atau penyedia layanan pihak ketiga yang terikat perjanjian pemrosesan data.

## 4. Berbagi dengan pihak ketiga

Kami dapat membagikan data kepada penyedia infrastruktur (hosting, email, penyimpanan objek) sejauh diperlukan untuk operasional layanan, serta apabila diwajibkan oleh hukum.

## 5. Hak subjek data

Sesuai UU PDP, Anda berhak meminta akses, koreksi, dan penghapusan data pribadi tertentu melalui pengaturan akun atau kontak di bawah.

## 6. Keamanan

Kami menerapkan kontrol teknis dan organisasi wajar, termasuk enkripsi transport, pembatasan akses, dan pemantauan keamanan.

## 7. Cookie

PSD menggunakan cookie sesi autentikasi httpOnly untuk menjaga Anda tetap masuk. Cookie ini diperlukan untuk fungsi inti platform.

## 8. Kontak Pengendali Data

Email: privasi@projeksainsdata.id

Lihat juga [Ketentuan Layanan](/legal/ketentuan-layanan).`,
  },
]

export function getLegalDocument(slug: string) {
  return legalDocuments.find((d) => d.slug === slug)
}
