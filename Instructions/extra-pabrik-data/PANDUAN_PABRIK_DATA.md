# Panduan Lengkap Pabrik Data

> Halaman ini menjelaskan cara menggunakan **Pabrik Data** — alat merancang alur pengolahan data (data
> pipeline) tanpa perlu menyiapkan server sendiri. Anda menyusun langkah pengolahan secara visual, memilih
> **engine** yang sesuai, menjalankannya, lalu hasilnya menjadi **aset dataset** Anda.

---

## 1. Apa itu Pabrik Data?

Pabrik Data adalah kanvas untuk merangkai **pipeline**: rangkaian node yang mengambil data (source),
mengolahnya (transform), lalu menghasilkan tabel akhir. Setiap pipeline dijalankan oleh **engine**, dan
hasil akhirnya (lapisan *gold*) disalurkan ke **aset dataset** — sehingga bisa dibagikan, dilihat, dan
dipakai kembali di notebook atau kompetisi.

Alur singkat: **susun node → pilih engine → validasi → pratinjau → jalankan → dataset hasil.**

---

## 2. Dua pilihan engine — pilih yang tepat

Saat menjalankan pipeline, Anda memilih salah satu dari dua engine (atau **Auto**, yang memilihkan
berdasarkan ukuran data).

### Opsi A — DuckDB (SQL)
- **Untuk:** data kecil hingga menengah, kebutuhan cepat & interaktif.
- **Bahasa:** SQL. Node visual otomatis menjadi SQL; tersedia juga **node SQL** (SELECT-only) untuk yang
  ingin menulis kueri sendiri.
- **Kelebihan:** sangat cepat, hemat, hasil hampir seketika.
- **Cocok bila:** data Anda muat di satu mesin (mis. puluhan–ratusan MB).

### Opsi B — Spark (PySpark)
- **Untuk:** data besar/terdistribusi yang tak muat di satu mesin.
- **Bahasa:** PySpark. Node visual otomatis menjadi kode PySpark; tersedia **Spark SQL**; dan pada tier
  tertinggi, **node kode .py** untuk transformasi khusus.
- **Kelebihan:** menangani data sangat besar dengan komputasi paralel.
- **Perhatian:** lebih berat & lebih lambat memulai — gunakan hanya untuk data besar.

### Ringkasnya

| Pertanyaan | Pilih DuckDB | Pilih Spark |
|---|---|---|
| Ukuran data? | Kecil–menengah | Besar |
| Butuh cepat/interaktif? | Ya | Tidak harus |
| Menulis kode .py sendiri? | Tidak (SQL) | Ya (tier tertinggi) |
| Hemat sumber daya? | Ya | Gunakan seperlunya |

> **Tidak yakin?** Pilih **Auto** — sistem memilih DuckDB untuk data kecil dan Spark untuk data besar.

---

## 3. Jenis node

- **Source** — sumber data. Ambil dari **aset dataset** Anda (termasuk hasil **notebook** yang sudah
  disimpan sebagai dataset, atau hasil **Ruang Panen Data**). *Bukan* menempel path file sembarang.
- **Filter** — saring baris berdasar kondisi (mis. `wilayah = 'Lampung'`).
- **Select** — pilih kolom tertentu.
- **Aggregate** — kelompokkan & hitung (count/sum/avg/min/max).
- **Join** — gabungkan dua sumber.
- **SQL** *(SELECT-only)* — tulis kueri Anda sendiri; hanya boleh membaca node di atasnya.
- **Kode PySpark (.py)** *(Spark, tier tertinggi)* — transformasi khusus dengan kontrak:
  ```python
  # inputs: daftar DataFrame dari node di atas; kembalikan satu DataFrame
  def transform(inputs):
      df = inputs[0]
      return df.dropDuplicates()
  ```

Setiap pipeline harus punya **tepat satu node keluaran (sink)**.

---

## 4. Langkah menjalankan pipeline

1. **Susun** node di kanvas & sambungkan alurnya.
2. **Pilih engine** (Auto/DuckDB/Spark).
3. **Validasi** — sistem memeriksa alur (tak boleh ada lingkaran/siklus, harus satu keluaran) dan
   menampilkan **SQL/PySpark** yang akan dijalankan (untuk transparansi & belajar).
4. **Pratinjau** — lihat contoh baris (terbatas) tanpa menyimpan.
5. **Jalankan** — proses berjalan; saat selesai muncul tautan **"Lihat dataset hasil"**.

---

## 5. Batas penggunaan (menurut tier)

Kapabilitas kedua engine terbuka bertahap mengikuti **tier** Anda. Semakin aktif, semakin tinggi tier,
semakin besar yang bisa diolah.

| Tier | DuckDB | Spark |
|---|---|---|
| **Pemula** | ≤ 200 MB, 5 run/hari | 🔒 belum terbuka |
| **Menengah** | ≤ 1 GB, 30 run/hari, **node SQL** | ≤ 20 GB, 10 run/hari (**tanpa** kode .py) |
| **Lanjut** | ≤ 5 GB, 100 run/hari | ≤ 200 GB, 50 run/hari, **node kode .py** |

> **Node kode .py** juga memerlukan **akses kernel** (disetujui admin) selain tier Lanjut — dua lapis demi
> keamanan, karena kode dijalankan di lingkungan terisolasi.

Jika Anda menemui pesan:
- **"Engine terkunci"** → tingkatkan tier (lihat bagian Poin & Quest) atau pakai DuckDB.
- **"Batas run harian tercapai"** → coba lagi besok atau tingkatkan tier.
- **"Ukuran data melebihi batas"** → perkecil data, atau gunakan engine/tier yang lebih tinggi.

---

## 6. Poin & Quest

Setiap aktivitas di Pabrik Data memberi **poin** yang menaikkan tier Anda:

| Aktivitas | Poin |
|---|---|
| Membuat pipeline | +5 |
| Menjalankan pipeline (sukses) | +10 |
| Memakai node SQL | +3 |
| Menjalankan di Spark (sukses) | +20 |
| Menghasilkan dataset dari pipeline | +25 |

**Quest** memberi bonus poin saat Anda mencapai target tertentu:

- **Analis Pemula** — jalankan pipeline pertama → +20
- **Penjelajah SQL** — pakai node SQL 3× → +30
- **Naik ke Spark** — jalankan pipeline di Spark → +50
- **Produsen Data** — hasilkan dataset (gold) → +40
- **Rajin Mengolah** — 10 pipeline sukses → +60

Pantau progres di **Panel Quest**; saat sebuah quest selesai, klaim rewardnya. Poin dari aktivitas &
quest membuka engine dan kapasitas yang lebih besar — jadi makin sering berkarya, makin luas yang bisa
Anda olah.

---

## 7. Tips & praktik baik

- Mulai dari **DuckDB** untuk mencoba cepat; pindah ke **Spark** hanya saat data benar-benar besar.
- Gunakan **Pratinjau** sebelum menjalankan penuh agar hemat kuota.
- Simpan sumber sebagai **aset dataset** (dari notebook atau Ruang Panen Data) agar pipeline rapi & reproducible.
- Baca **SQL/PySpark** yang ditampilkan saat validasi — cara bagus belajar kueri nyata.
- Beri nama pipeline & dataset hasil dengan jelas agar mudah ditemukan lewat pencarian.

---

*Butuh bantuan lebih lanjut? Buka menu Bantuan atau ajukan pertanyaan lewat layanan Pengaduan Platform.*
