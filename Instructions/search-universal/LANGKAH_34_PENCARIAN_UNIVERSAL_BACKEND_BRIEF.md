# Langkah 34 — Backend Pencarian Universal (Lintas Semua Entitas PSD)

> **Tujuan:** Naikkan pencarian dari "aset saja" → **universal**: **akun/username**, **postingan (feed)**,
> **organisasi**, proyek, model, dataset, notebook, kompetisi, event, tim, forum. Hasil digabung &
> diperingkat lintas tipe, dikelompokkan per kategori, dengan filter `type:`/`@user`/`#tag`/`owner:`.
> **Kerjakan setelah entitas inti, detail aset, sosial/feed, & organisasi (Langkah 36).** Prasyarat:
> aset (15/31), akun, postingan/feed (24), organisasi (36), kompetisi (32), event, teams, forum.
>
> Logika inti **lulus 9 uji** di `psd-search/app/search/` (termговsuk sumber akun/postingan/organisasi).

## 1. Arsitektur

- **SearchEngine** menjalankan banyak **Source** (satu per entitas), menggabungkan hit ternormalisasi,
  memeringkat (relevansi × bobot tipe + popularitas), lalu mengelompokkan.
- Tiap **Source** membungkus query DB satu entitas → hit `{id, title, subtitle, url, popularity}`.
- Mulai dengan `ILIKE`/trigram; bila perlu skala, pindah ke **Postgres `tsvector`** atau mesin eksternal
  (Meilisearch/OpenSearch) tanpa mengubah kontrak Source.

## 2. Service (cermin scaffold teruji)

- `query.parse_query` — teks + filter (`type:`, `@user`, `#tag`, `owner:`); alias ID/EN → kind kanonik.
- `relevance.text_score/score_hit` — exact>prefix>substring>token; boost popularitas hanya bila cocok;
  query kosong → mode jelajah (urut popularitas).
- `engine.SearchEngine.search` — gabung lintas sumber, urut skor, `grouped` per kategori; hormati `type:`.

## 3. Sumber per entitas (implementasi seam)

Buat satu kelas per entitas (kind): `user, post, org, project, model, dataset, competition, event,
team, forum, notebook`. Pola:

```python
class OrgSource:
    kind = "org"
    def __init__(self, db): self.db = db
    def search(self, text, filters, limit):
        q = select(Organization)  # hormati visibilitas
        if text:
            q = q.where(or_(Organization.name.ilike(f"%{text}%"),
                            Organization.handle.ilike(f"%{text}%")))
        rows = self.db.execute(q.limit(limit)).scalars().all()
        return [{"id": o.handle, "title": o.name, "subtitle": "Organisasi",
                 "url": f"/orgs/{o.handle}", "popularity": o.member_count} for o in rows]

class UserSource:      # akun/username
    kind = "user"
    def search(self, text, filters, limit):
        # cari username & nama tampilan; url /{username}
        raise NotImplementedError

class PostSource:      # postingan feed
    kind = "post"
    def search(self, text, filters, limit):
        # cari isi postingan publik; subtitle "Feed"; url /feed/{id}
        raise NotImplementedError
```

> **Visibilitas:** setiap sumber hanya mengembalikan entitas yang boleh dilihat pemanggil (publik atau
> milik/را diizinkan). Untuk privasi, jangan munculkan akun/aset privat ke non-pemilik.

## 4. Endpoint — `app/modules/search/router.py`

| Method | Path | Aksi |
|---|---|---|
| GET | `/search?q=&type=&limit=&per_category=` | Jalankan `SearchEngine.search`. Untuk **dropdown header**: `per_category` kecil (mis. 3–5) → kembalikan `grouped`. Untuk **halaman hasil**: `limit` besar + `type` opsional → `results` (paginated). |
| GET | `/search/suggest?q=` | (Opsional) saran cepat: top 1–3 lintas tipe untuk autocomplete. |

Respons: `{ query, total, results: [{kind,id,title,subtitle,url,score}], grouped: {kind: [...]} }`.

- **Header dropdown**: tampilkan `grouped` (beberapa per kategori) + tautan "Lihat semua".
- **Halaman `/search`**: tab per `type` (Semua/Akun/Kompetisi/Event/…) memakai `type=` + paginasi.

## 5. Performa

- Tambah indeks teks per kolom yang dicari (Postgres `pg_trgm` GIN, atau kolom `tsvector` + GIN).
- Batasi `source_limit` per sumber; jalankan sumber paralel bila perlu (async/threadpool).
- Cache hasil populer (Redis) untuk query pendek umum.

## 6. Definition of Done

- [ ] `/search` mengembalikan hasil lintas **semua entitas**, terperingkat & terkelompok.
- [ ] Filter `type:`/`@user`/`#tag`/`owner:` berfungsi; alias ID/EN dikenali.
- [ ] Query kosong + `type:` → mode jelajah (urut popularitas).
- [ ] Visibilitas dihormati (privat tak bocor).
- [ ] Logika (cermin `psd-search/app/search/tests/`) hijau.

## 7. Gotcha

- **Relevansi vs popularitas**: popularitas hanya *boost* saat ada kecocokan teks (jangan munculkan
  item populer tapi tak relevan) — sudah ditegakkan `score_hit`.
- **Visibilitas per sumber** wajib; pencarian gampang membocorkan data privat bila lalai.
- **Normalisasi kind** (jamak/tunggal, ID/EN) agar `type:` & tab konsisten.
- **N+1 / beban DB**: batasi `source_limit`, pakai indeks teks; pertimbangkan paralelisasi sumber.
- **Skalanya**: kontrak Source memungkinkan pindah ke Meilisearch/OpenSearch tanpa ubah endpoint.
