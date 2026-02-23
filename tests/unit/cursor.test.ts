import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../../src/utils/cursor.js';

describe('cursor utils', () => {
  it('encode -> decode roundtrip', () => {
    const input = {
      createdAt: new Date('2026-01-01T12:00:00.000Z'),
      id: '11111111-1111-4111-8111-111111111111',
    };

    const encoded = encodeCursor(input);
    const decoded = decodeCursor(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(input.id);
    expect(decoded?.createdAt.toISOString()).toBe(input.createdAt.toISOString());
  });

  it('decode(undefined/null/empty) -> null', () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });

  it('invalid base64 -> null', () => {
    expect(decodeCursor('!!!not-base64!!!')).toBeNull();
  });

  it('invalid JSON -> null', () => {
    const badJsonB64 = Buffer.from('not-json', 'utf8').toString('base64');
    expect(decodeCursor(badJsonB64)).toBeNull();
  });

  it('invalid date -> null', () => {
    const payload = JSON.stringify({
      createdAt: 'not-a-date',
      id: '11111111-1111-4111-8111-111111111111',
    });
    const b64 = Buffer.from(payload, 'utf8').toString('base64');

    expect(decodeCursor(b64)).toBeNull();
  });

  it('same createdAt + different ids are encoded/decoded distinctly', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    const c1 = encodeCursor({ createdAt, id: '11111111-1111-4111-8111-111111111111' });
    const c2 = encodeCursor({ createdAt, id: '22222222-2222-4222-8222-222222222222' });

    expect(c1).not.toBe(c2);
    expect(decodeCursor(c1)?.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(decodeCursor(c2)?.id).toBe('22222222-2222-4222-8222-222222222222');
  });
});
