# Performance Notes: Notes API

## Goal

Показать влияние индексов на:

- cursor pagination (`ORDER BY "createdAt" DESC, "id" DESC LIMIT 20`)
- фильтры по `tags` (`jsonb_exists_any/jsonb_exists_all`)

## Environment

- Date:                         17.02.2026
- Machine (CPU/RAM):            3.5 GHz (6+8), 32 GB (4xDDR5, ~4500 MHZ)
- OS:                           Windows 11 Pro (23H2)
- PostgreSQL version:           17.5
- Dataset size (`Note` rows):   100 000 (100k (npm run seed -- --count=100000 --batch=2000 --reset=true))
- Cache mode:                   - (warm / cold)
- DB settings changed (if any): -

## Dataset

```sql
SELECT COUNT(*) AS notes_count FROM "Note";
```

(Опиши, как генерировал данные: seed/script, распределение tags)

## Queries Under Test

### Q1: List first page (no tags)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id","title","content","tags","createdAt","updatedAt"
FROM "Note"
ORDER BY "createdAt" DESC, "id" DESC
LIMIT 20;
```

### Q2: tagsAny

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id","title","content","tags","createdAt","updatedAt"
FROM "Note"
WHERE jsonb_exists_any("tags", ARRAY['a'::text,'b'::text])
ORDER BY "createdAt" DESC, "id" DESC
LIMIT 20;
```

### Q3: tagsAll

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT "id","title","content","tags","createdAt","updatedAt"
FROM "Note"
WHERE jsonb_exists_all("tags", ARRAY['a'::text,'b'::text])
ORDER BY "createdAt" DESC, "id" DESC
LIMIT 20;
```

## BEFORE indexes

### Drop indexes

```sql
DROP INDEX IF EXISTS "idx_notes_createdAt_id_desc";
DROP INDEX IF EXISTS "idx_note_tags_gin";
```

### Results (run each query 3-5 times, keep median)

| Query | Plan shape | Execution Time (ms) | Shared Hit | Shared Read |
|------|------------|---------------------|------------|-------------|
| Q1   |Limit -> Sort (top-N heapsort) -> Seq Scan|20.673|996|0|
| Q2   |Limit -> Sort (quicksort) -> Seq Scan + Filter jsonb_exists_any|5.592|996|0|
| Q3   |Limit -> Sort (quicksort) -> Seq Scan + Filter jsonb_exists_all|4.774|996|0|

### Raw plans

#### Q1 BEFORE

```text
Limit  (cost=2826.48..2826.53 rows=20 width=126) (actual time=20.658..20.660 rows=20 loops=1)
  Buffers: shared hit=996
  ->  Sort  (cost=2826.48..2951.48 rows=50000 width=126) (actual time=20.657..20.658 rows=20 loops=1)
        Sort Key: "createdAt" DESC, id DESC
        Sort Method: top-N heapsort  Memory: 34kB
        Buffers: shared hit=996
        ->  Seq Scan on "Note"  (cost=0.00..1496.00 rows=50000 width=126) (actual time=0.009..1.577 rows=50000 loops=1)
              Buffers: shared hit=996
Planning Time: 0.044 ms
Execution Time: 20.673 ms

```

#### Q2 BEFORE

```text
Limit  (cost=2064.50..2064.55 rows=20 width=126) (actual time=5.580..5.581 rows=0 loops=1)
  Buffers: shared hit=996
  ->  Sort  (cost=2064.50..2106.17 rows=16667 width=126) (actual time=5.579..5.580 rows=0 loops=1)
        Sort Key: "createdAt" DESC, id DESC
        Sort Method: quicksort  Memory: 25kB
        Buffers: shared hit=996
        ->  Seq Scan on "Note"  (cost=0.00..1621.00 rows=16667 width=126) (actual time=5.575..5.576 rows=0 loops=1)
              Filter: jsonb_exists_any(tags, '{a,b}'::text[])
              Rows Removed by Filter: 50000
              Buffers: shared hit=996
Planning Time: 0.049 ms
Execution Time: 5.592 ms

```

#### Q3 BEFORE

```text
Limit  (cost=2064.50..2064.55 rows=20 width=126) (actual time=4.763..4.764 rows=0 loops=1)
  Buffers: shared hit=996
  ->  Sort  (cost=2064.50..2106.17 rows=16667 width=126) (actual time=4.762..4.763 rows=0 loops=1)
        Sort Key: "createdAt" DESC, id DESC
        Sort Method: quicksort  Memory: 25kB
        Buffers: shared hit=996
        ->  Seq Scan on "Note"  (cost=0.00..1621.00 rows=16667 width=126) (actual time=4.758..4.758 rows=0 loops=1)
              Filter: jsonb_exists_all(tags, '{a,b}'::text[])
              Rows Removed by Filter: 50000
              Buffers: shared hit=996
Planning Time: 0.050 ms
Execution Time: 4.774 ms

```

## AFTER indexes

### Create indexes

```sql
CREATE INDEX IF NOT EXISTS "idx_notes_createdAt_id_desc"
  ON "Note"("createdAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "idx_note_tags_gin"
  ON "Note" USING GIN ("tags");
```

### Results (same protocol)

| Query | Plan shape | Execution Time (ms) | Shared Hit | Shared Read |
|------|------------|---------------------|------------|-------------|
| Q1   |Limit -> Index Scan (idx_notes_createdAt_id_desc)|0.025|1|2|
| Q2   |Limit -> Index Scan (idx_notes_createdAt_id_desc) + Filter jsonb_exists_any|8.394|998|246|
| Q3   |Limit -> Index Scan (idx_notes_createdAt_id_desc) + Filter jsonb_exists_all|6.631|1244|0|

### Raw plans

#### Q1 AFTER

```text
Limit  (cost=0.29..1.91 rows=20 width=126) (actual time=0.015..0.018 rows=20 loops=1)
  Buffers: shared hit=1 read=2
  ->  Index Scan using "idx_notes_createdAt_id_desc" on "Note"  (cost=0.29..4051.23 rows=50000 width=126) (actual time=0.014..0.017 rows=20 loops=1)
        Buffers: shared hit=1 read=2
Planning:
  Buffers: shared hit=30 read=1
Planning Time: 0.185 ms
Execution Time: 0.025 ms
```

#### Q2 AFTER

```text
Limit  (cost=0.29..5.30 rows=20 width=126) (actual time=8.383..8.383 rows=0 loops=1)
  Buffers: shared hit=998 read=246
  ->  Index Scan using "idx_notes_createdAt_id_desc" on "Note"  (cost=0.29..4176.23 rows=16667 width=126) (actual time=8.382..8.382 rows=0 loops=1)
        Filter: jsonb_exists_any(tags, '{a,b}'::text[])
        Rows Removed by Filter: 50000
        Buffers: shared hit=998 read=246
Planning Time: 0.060 ms
Execution Time: 8.394 ms
```

#### Q3 AFTER

```text
Limit  (cost=0.29..5.30 rows=20 width=126) (actual time=6.620..6.620 rows=0 loops=1)
  Buffers: shared hit=1244
  ->  Index Scan using "idx_notes_createdAt_id_desc" on "Note"  (cost=0.29..4176.23 rows=16667 width=126) (actual time=6.618..6.618 rows=0 loops=1)
        Filter: jsonb_exists_all(tags, '{a,b}'::text[])
        Rows Removed by Filter: 50000
        Buffers: shared hit=1244
Planning Time: 0.060 ms
Execution Time: 6.631 ms
```

## Delta Summary

| Query | Before (ms) | After (ms) | Improvement |
|------|-------------|------------|-------------|
| Q1   |20.673|0.025|+99.88% (быстрее, ~826.9x)|
| Q2   |5.592|8.394|-50.11% (медленнее, ~1.50x)|
| Q3   |4.774|6.631|-38.90% (медленнее, ~1.39x)|

## Conclusions

- Что ускорилось:
  - `Q1` ускорился радикально: `20.673 ms -> 0.025 ms` (~`99.88%`).
  - Причина: pagination по `ORDER BY createdAt DESC, id DESC LIMIT 20` стала читать первые 20 строк напрямую из индекса.

- Почему (Index Scan / Bitmap Index Scan вместо Seq Scan):
  - Для `Q1` план сменился с `Seq Scan + Sort` на `Index Scan` по `idx_notes_createdAt_id_desc`, и отдельная сортировка больше не нужна.
  - Для `Q2/Q3` GIN-индекс по `tags` в плане не использовался (нет `Bitmap Index Scan`/`Bitmap Heap Scan`), поэтому выигрыш по фильтрам не получен.

- Где эффект минимальный:
  - `Q2` и `Q3` не улучшились, а стали медленнее (`5.592 -> 8.394 ms`, `4.774 -> 6.631 ms`).
  - В планах видно `Rows Removed by Filter: 50000`: фактически идёт полный проход с фильтром по тегам, только через другой путь доступа.

- Риски/ограничения (локальная машина, warm cache, размер данных):
  - Замеры сделаны локально и на одном наборе данных (`50k`), результаты зависят от железа и состояния кэша.
  - В `Q2/Q3` возвращается `0 rows`, это частный сценарий; для других селективностей поведение может отличаться.
  - Для корректного сравнения нужны несколько прогонов (медиана) и фиксированный протокол warm/cold cache.

## Reproduce

1. Apply migrations.
2. Seed/generate dataset.
3. Drop indexes, run Q1-Q3 with `EXPLAIN (ANALYZE, BUFFERS)`.
4. Recreate indexes, rerun Q1-Q3.
5. Fill tables and raw plans.
