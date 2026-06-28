# Gamifikasi PSD — sumber kebenaran tunggal

Modul Python + manifest JSON untuk **5 tier** reputasi PSD:

| Level | Slug | Label | Reputasi min |
|------:|------|-------|-------------:|
| 0 | `pemula` | Pemula | 0 |
| 1 | `kontributor` | Kontributor | 50 |
| 2 | `ahli` | Ahli | 250 |
| 3 | `master` | Master | 1.000 |
| 4 | `grandmaster` | Grandmaster | 5.000 |

Badge SVG tier: `psd-frontend/public/badges/Badges-psd-0{1-5}-*.svg`

## File kanonik

- `psd_gamification/gamification.json` — tier, poin reputasi, badge pencapaian, matriks kuota
- `psd_gamification/tiers.py` — `tier_for_reputation`, `perks_for_reputation`
- `psd_gamification/quota.py` — `quota()`, `check_and_consume`, `validate_matrix()`
- `psd_gamification/points.py` — poin per aktivitas
- `psd_gamification/badges.py` — badge pencapaian (bukan tier level)

Frontend membaca manifest yang sama via `psd-frontend/src/lib/gamification/config.ts`.

Brief desain: `Instructions/Gamifikasi-sumber/GAMIFIKASI_KUOTA_BRIEF.md`

## Uji

```bash
cd psd-gamification && pip install -e . && pytest -q
cd psd-backend && pip install -e ../psd-gamification && pytest app/hub/tests/test_hub.py app/serving/tests/test_serving.py -q
```

## Aturan

- **Jangan** duplikasi angka tier/kuota di luar `gamification.json`.
- Ubah kuota/tier di JSON → rebuild backend & frontend.
