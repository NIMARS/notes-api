// cursor -_- base64("isoDate|uuid")
// sort by: createdAt DESC, id DESC

export type CursorValue = { createdAt: Date; id: string };

export const encodeCursor = (c: CursorValue) =>
  Buffer.from(JSON.stringify({
    createdAt: c.createdAt.toISOString(),
    id: c.id,
  }), 'utf8').toString('base64')


  export const decodeCursor = (v?: string | null): CursorValue | null => {
    if (!v) return null
    try {
      const raw = JSON.parse(Buffer.from(v, 'base64').toString('utf8')) as { createdAt: string; id: string }
      const d = new Date(raw.createdAt)
      if (Number.isNaN(d.getTime())) return null
      return { createdAt: d, id: raw.id }
    } catch { return null }
  }
  
