# Langkah 47 — Pabrik Data: Introspeksi Skema (pendukung Kanvas)

> **Tujuan:** Endpoint kecil agar kanvas tahu **kolom** tiap sumber (untuk pemilih kolom di node). Sebagian besar Langkah 47 ada di frontend (kanvas React Flow); backend hanya menambah introspeksi skema. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 44–46 (sumber, engine `_connect`/`_resolve_source`).

## 47.1 Endpoint — `app/modules/factory/router.py` (tambah)

```python
from app.modules.factory.engine import _connect, _resolve_source
from app.modules.factory.models import DataSource

@router.get("/data-sources/{sid}/schema")
async def source_schema(sid: str, user=Depends(get_current_user), db=Depends(get_db)):
    s = (await db.execute(select(DataSource).where(DataSource.id == sid))).scalar_one_or_none()
    if not s: raise ApiError(404, "not_found", "Sumber tidak ditemukan")
    # pakai cache bila ada
    if s.schema_json and s.schema_json.get("columns"):
        return s.schema_json
    uri, fmt = await _resolve_source(db, sid)
    reader = f"read_parquet('{uri}')" if fmt == "parquet" else f"read_csv_auto('{uri}')"
    con = _connect()
    try:
        rows = con.execute(f"DESCRIBE SELECT * FROM {reader} LIMIT 0;").fetchall()
        cols = [{"name": r[0], "type": str(r[1])} for r in rows]
    finally:
        con.close()
    s.schema_json = {"columns": cols}; await db.commit()
    return s.schema_json
```

> `DESCRIBE SELECT ... LIMIT 0` mengambil skema tanpa memindai isi (murah). Hasil disimpan ke `DataSource.schema_json` sebagai cache; introspeksi ulang bila dataset diganti (hapus cache atau tambahkan tombol refresh nanti).

## 47.2 Pembaruan Kontrak (Bagian 8)

- `SourceSchema { columns:[{name,type}] }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/data-sources/{id}/schema` | ✓ | kolom sumber (cache) |

## Selesai bila

- [ ] Endpoint mengembalikan kolom + tipe sumber; hasil di-cache di `schema_json`.
- [ ] Tidak memindai seluruh isi (LIMIT 0).
