import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../setup.ts';
import { prisma } from '../../src/db/prisma.js';

describe('Auth/RBAC for v1 notes', () => {
  const writer = 'writer-token';
  const admin = 'admin-token';
  const reader = 'reader-token';

  const payload = { title: 'Protected note', content: 'x', tags: ['auth'] };

  it('POST /v1/notes without token -> 401', async () => {
    const res = await request(app.server).post('/v1/notes').send(payload);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
  });

  it('POST /v1/notes without notes:write -> 403', async () => {
    const res = await request(app.server)
      .post('/v1/notes')
      .set('Authorization', `Bearer ${reader}`)
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
  });

  it('POST /v1/notes with writer-token -> 201', async () => {
    const res = await request(app.server)
      .post('/v1/notes')
      .set('Authorization', `Bearer ${writer}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-fA-F-]{36}$/);
  });

  it('DELETE /v1/notes/:id without token -> 401', async () => {
    const note = await prisma.note.create({ data: payload });
    const res = await request(app.server).delete(`/v1/notes/${note.id}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
  });

  it('DELETE /v1/notes/:id with writer-token -> 403', async () => {
    const note = await prisma.note.create({ data: payload });
    const res = await request(app.server)
      .delete(`/v1/notes/${note.id}`)
      .set('Authorization', `Bearer ${writer}`);
      
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
  });

  it('DELETE /v1/notes/:id with admin-token -> 204', async () => {
    const note = await prisma.note.create({ data: payload });
    const res = await request(app.server)
      .delete(`/v1/notes/${note.id}`)
      .set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(204);
  });

  it('legacy /notes write remains public + deprecation headers', async () => {
    const res = await request(app.server).post('/notes').send(payload);
    expect(res.status).toBe(201);
    expect(res.headers.deprecation).toBe('true');
    expect(res.headers.sunset).toBeDefined();
    expect(res.headers.link).toContain('/v1/notes');
  });
});
