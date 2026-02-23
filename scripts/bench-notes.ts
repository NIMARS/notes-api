import { performance } from 'node:perf_hooks';

type Scenario = { name: string; path: string };

const BASE_URL    = process.env.BENCH_BASE_URL ?? 'http://localhost:3000';
const REQUESTS    = Number(process.env.BENCH_REQUESTS ?? 500);
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY ?? 20);
const WARMUP      = Number(process.env.BENCH_WARMUP ?? 50);

const scenarios: Scenario[] = [
  { name: 'notes_no_filter', path: '/notes?limit=20' },
  { name: 'notes_tags_any',  path: '/notes?limit=20&tagsAny=fastify&tagsAny=backend' },
  { name: 'notes_tags_all',  path: '/notes?limit=20&tagsAll=fastify&tagsAll=backend' },
  { name: 'notes_tags_mix',  path: '/notes?limit=20&tagsAny=prisma&tagsAll=db' },
];

const percentile = (values: number[], p: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
};

async function runScenario(s: Scenario) {
  const latencies: number[] = [];
  let errors = 0;
  let cursor = 0;

  const runOne = async () => {
    const started = performance.now();
    const res = await fetch(`${BASE_URL}${s.path}`);
    await res.arrayBuffer();
    const elapsed = performance.now() - started;
    latencies.push(elapsed);
    if (!res.ok) errors++;
  };

  for (let i = 0; i < WARMUP; i++) await runOne();

  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= REQUESTS) return;
      await runOne();
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  return {
    scenario: s.name,
    requests: latencies.length,
    errors,
    avg_ms: Number(avg.toFixed(3)),
    p50_ms: Number(percentile(latencies, 50).toFixed(3)),
    p95_ms: Number(percentile(latencies, 95).toFixed(3)),
  };
}

async function main() {
  const results = [];
  for (const s of scenarios) results.push(await runScenario(s));
  console.table(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
