import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import { env } from '../bootstrap/env.js';
import { AppError } from '../errors/app-error.js';

type AuthCtx = { token: string; scopes: string[] };

const parseBearer = (header?: string): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

export const authenticate: preHandlerHookHandler = async (req: FastifyRequest) => {
  const token = parseBearer(req.headers.authorization);
  if (!token) throw AppError.unauthorized('Missing or invalid bearer token');

  const scopes = env.AUTH_TOKENS_JSON[token];
if (!scopes) throw AppError.unauthorized('Invalid token');

(req as FastifyRequest & { auth: { token: string; scopes: string[] } }).auth = {
  token,
  scopes,
};
};

export const requireScopes = (required: string[]): preHandlerHookHandler =>
  async (req: FastifyRequest) => {
    const auth = (req as FastifyRequest & { auth?: AuthCtx }).auth;
    if (!auth) throw AppError.unauthorized('Unauthorized');

    const ok = required.every((s) => auth.scopes.includes(s));
    if (!ok) throw new AppError('FORBIDDEN', 'Forbidden', 403, { required });
  };
