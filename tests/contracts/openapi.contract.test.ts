import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../setup.ts';

type MaybeOpenApi = { servers?: Array<{ url?: string } & Record<string, unknown>> } & Record<string, unknown>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const normalizeOpenApi = (doc: unknown): unknown => {
  if (!isRecord(doc)) return doc;

  const copy = structuredClone(doc) as MaybeOpenApi;

  if (Array.isArray(copy.servers)) {
    copy.servers = copy.servers.map((s) => {
      if (!isRecord(s)) return s;
      return { ...s, url: '<normalized-url>' };
    }) as MaybeOpenApi['servers'];
  }

  return copy;
};

describe('OpenAPI contract', () => {
  it('GET /docs/json matches snapshot', async () => {
    const res = await request(app.server).get('/docs/json');
    expect(res.status).toBe(200);

    const normalized = normalizeOpenApi(res.body);
    expect(normalized).toMatchSnapshot();
  });
});
