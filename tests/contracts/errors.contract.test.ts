import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../setup.ts';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const normalizeErrorBody = (body: unknown) => {
  if (!isRecord(body)) {
    return { error: undefined, message: undefined, reqId: undefined, details: undefined };
  }

  const reqId = typeof body.reqId === 'string' ? '<reqId>' : undefined;

  return {
    error: typeof body.error === 'string' ? body.error : undefined,
    message: typeof body.message === 'string' ? body.message : undefined,
    reqId,
    details: body.details,
  };
};

describe('Error contract snapshots', () => {
  it('400 snapshot', async () => {
    const res = await request(app.server).post('/notes').send({ content: 'no title' });
    expect(res.status).toBe(400);
    expect({ status: res.status, body: normalizeErrorBody(res.body) }).toMatchSnapshot();
  });

  it('401 snapshot', async () => {
    const res = await request(app.server).post('/v1/notes').send({ title: 't', content: 'c', tags: [] });
    expect(res.status).toBe(401);
    expect({ status: res.status, body: normalizeErrorBody(res.body) }).toMatchSnapshot();
  });

  it('403 snapshot', async () => {
    const res = await request(app.server)
      .post('/v1/notes')
      .set('Authorization', 'Bearer reader-token')
      .send({ title: 't', content: 'c', tags: [] });

    expect(res.status).toBe(403);
    expect({ status: res.status, body: normalizeErrorBody(res.body) }).toMatchSnapshot();
  });

  it('404 snapshot', async () => {
    const res = await request(app.server).get('/unknown');
    expect(res.status).toBe(404);
    expect({ status: res.status, body: normalizeErrorBody(res.body) }).toMatchSnapshot();
  });
});
