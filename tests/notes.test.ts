import request from 'supertest';
import { app } from './setup';
import { prisma } from '../src/db/prisma'
import { Note } from '@prisma/client';


describe('Notes API', () => {

    //GET /health → 200.
    it('GET /health → 200', async () => {
        const res = await request(app.server).get('/health');
        console.log(res.status);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    //GET /docs/json → 200 include openapi.
    it('GET /docs/json → 200 include openapi', async () => {
        const res = await request(app.server).get('/docs/json');
        expect(res.status).toBe(200);
        expect(res.body.openapi).toBeDefined();
    });

    //GET /notes empty → 200, items=[]
    it('GET /notes empty → 200, items=[]', async () => {
        const res = await request(app.server).get('/notes');
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]);
    });

    //POST /notes happy path → 201, id uuid.
    it('POST /notes happy path → 201', async () => {
        const payload = { title: 'Test Note', content: 'Some content', tags: ['a'] };
        const res = await request(app.server).post('/notes').send(payload);
        expect(res.status).toBe(201);
        expect(res.body.id).toMatch(/^[0-9a-fA-F-]{36}$/); // UUID
        expect(res.body.title).toBe(payload.title);
        expect(res.body.tags).toEqual(payload.tags);
    });

    //GET /notes/:id find → 200.
    it('GET /notes/:id find → 200', async () => {
        const note = await prisma.note.create({ data: { title: 'A', content: 'B', tags: ['x'] } });
        const res = await request(app.server).get(`/notes/${note.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(note.id);
    });

    //GET /notes/:id not find → 404.
    it('GET /notes/:id not find → 404', async () => {
        const res = await request(app.server).get('/notes/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });

    //GET /notes/:id wrong uuid→ 400.
    it('GET /notes/:id wrong uuid → 400', async () => {
        const res = await request(app.server).get('/notes/not-a-uuid');
        expect(res.status).toBe(400);
    });

    //PATCH /notes/:id change title → 200.
    it('PATCH /notes/:id change title → 200', async () => {
        const note1 = await prisma.note.create({ data: { title: 'Note 1', content: 'Content 1', tags: ['a'] } });

        const res = await request(app.server)
            .patch(`/notes/${note1.id}`)
            .send({ title: 'Updated Note 1' });
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Updated Note 1');
    });

    //PATCH /notes/:id not found → 404.
    it('PATCH /notes/:id not found → 200', async () => {
        const res = await request(app.server)
            .patch('/notes/00000000-0000-0000-0000-000000000000')
            .send({ title: 'Doesnt even matter -_-' });
        expect(res.status).toBe(404);
    });

    describe('DELETE /notes', () => {
        let note1: Note;

        beforeEach(async () => {
            note1 = await prisma.note.create({ data: { title: 'Note 1', content: 'Content 1', tags: ['a'] } });
        });

        //DELETE /notes/:id → 204
        it('DELETE /notes/:id → 204', async () => {
            const res = await request(app.server).delete(`/notes/${note1.id}`);
            expect(res.status).toBe(204);
        });

        //DELETE /notes/:id repeat → 404
        it('DELETE /notes/:id repeat → 404', async () => {
            await request(app.server).delete(`/notes/${note1.id}`);
            const res = await request(app.server).delete(`/notes/${note1.id}`);
            expect(res.status).toBe(404);
        });
    });


    //Validate POST /notes without title → 400.
    it('Validate POST /notes without title → 400', async () => {
        const res = await request(app.server)
            .post('/notes')
            .send({ content: 'No title' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('message');
    });

    //Validate POST /notes tags !array → 400.
    it('Validate POST /notes tags !array → 400', async () => {
        const res = await request(app.server)
            .post('/notes')
            .send({ title: 'Title', content: 'Content', tags: 'not-array-tag' });
        expect(res.status).toBe(400);
    });

    //GET /notes filter tagsAny=["a"] → returen filtred.
    it('GET /notes filter tagsAny=["a"]', async () => {
        const note1 = await prisma.note.create({ data: { title: 'Note 1', content: 'Content 1', tags: ['a']      } });
        const note2 = await prisma.note.create({ data: { title: 'Note 2', content: 'Content 2', tags: ['a', 'b'] } });
                      await prisma.note.create({ data: { title: 'Note 3', content: 'Content 3', tags: ['b']      } });
        const res = await request(app.server)
            .get('/notes')
            .query({ tagsAny: ['a'] });

        expect(res.body.items.map((n: Note) => n.id)).toEqual(expect.arrayContaining([note1.id, note2.id]));
        expect(res.body.items).toHaveLength(2);
    });

    //GET /notes filter tagsAll=["a","b"] → both tags.
    it('GET /notes filter tagsAll=["a","b"]', async () => {
                      await prisma.note.create({ data: { title: 'Note 1', content: 'Content 1', tags: ['a']      } });
        const note2 = await prisma.note.create({ data: { title: 'Note 2', content: 'Content 2', tags: ['a', 'b'] } });
                      await prisma.note.create({ data: { title: 'Note 3', content: 'Content 3', tags: ['b']      } });
        const res   = await request(app.server)
            .get('/notes')
            .query({ tagsAll: ['a', 'b'] });
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].id).toBe(note2.id);
    });

    //tagsAny+tagsAll → корректное пересечение.
    it('GET /notes filter tagsAny+tagsAll', async () => {
                      await prisma.note.create({ data: { title: 'Note 1', content: 'Content 1', tags: ['a'] }      });
        const note2 = await prisma.note.create({ data: { title: 'Note 2', content: 'Content 2', tags: ['a', 'b'] } });
        const note3 = await prisma.note.create({ data: { title: 'Note 3', content: 'Content 3', tags: ['b'] }      });
        const res   = await request(app.server)
            .get('/notes')
            .query({ tagsAny: ['a', 'b'], tagsAll: ['b'] });
        expect(res.body.items.map((n: Note) => n.id)).toEqual(expect.arrayContaining([note2.id, note3.id]));
    });

    //Pagination: limit 2, first page, with nextCursor.
    it('Pagination: limit 2, first page', async () => {
        await prisma.note.create({ data: { title: 'Note 1', content: 'Content 1', tags: ['a'] }      });
        await prisma.note.create({ data: { title: 'Note 2', content: 'Content 2', tags: ['a', 'b'] } });
        await prisma.note.create({ data: { title: 'Note 3', content: 'Content 3', tags: ['b'] }      });
        const res = await request(app.server).get('/notes').query({ limit: 2 });
        expect(res.body.items).toHaveLength(2);
        expect(res.body.nextCursor).toBeDefined();
    });

    //Pagination: second page by nextCursor → next elemtns.
    it('Pagination: second page by nextCursor', async () => {
        await prisma.note.create({ data: { title: 'Note 1', content: 'Content 1', tags: ['a'] }      });
        await prisma.note.create({ data: { title: 'Note 2', content: 'Content 2', tags: ['a', 'b'] } });
        await prisma.note.create({ data: { title: 'Note 3', content: 'Content 3', tags: ['b'] }      });
        const first = await request(app.server).get('/notes').query({ limit: 2 });
        expect(first.body.items).toHaveLength(2);
        expect(first.body.nextCursor).toBeDefined();

        const second = await request(app.server).get('/notes').query({ limit: 2, cursor: first.body.nextCursor });
        expect(second.body.items).toHaveLength(2);
    });

    //Stable sort with same created_at by id DESC.
    it('Stable sort with same created_at by id DESC.', async () => {
        const now = new Date();
        await prisma.note.createMany({
            data: [
                { title: 'X', content: 'x', tags: [], createdAt: now, updatedAt: now },
                { title: 'Y', content: 'y', tags: [], createdAt: now, updatedAt: now },
            ],
        });
        const res = await request(app.server).get('/notes').query({ limit: 5 });
        const sorted = res.body.items.map((n: Note) => n.id);

        const ids = [...sorted].sort().reverse();
        expect(sorted).toEqual(ids);
    });

    //NotFound-handler: GET /unknown → 404 JSON.
    it('GET /unknown → 404 JSON', async () => {
        const res = await request(app.server).get('/unknown');
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('message');
    });

    //error - uniq JSON for ( error,message).
    it('error - uniq JSON for ( error,message)', async () => {
        const res = await request(app.server)
            .post('/notes')
            .send({ title: '', content: '' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('message');
    });

});