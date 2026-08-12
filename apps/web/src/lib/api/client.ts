import 'server-only';

import { SignJWT } from 'jose';

import type { ApiErrorBody, FieldError } from '@courte/contract';

import { env } from '@/config/env';
import { API_TIMEOUT_MS, API_TOKEN_TTL_SECONDS } from '@/consts';

const jwtSecret = new TextEncoder().encode(env.API_JWT_SECRET);

/**
 * What the API's error body looks like on this side of the wire. Carries the code so callers
 * can branch on `NOT_FOUND` for a 404 page without string-matching a message.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(status: number, body: ApiErrorBody, options?: ErrorOptions) {
    super(body.message, options);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.errors ?? [];
  }

  /** Field detail when there is any — 'Invalid input' alone helps nobody. */
  toFormMessage(): string {
    if (this.fieldErrors.length === 0) return this.message;
    return this.fieldErrors.map(field => `${field.field}: ${field.message}`).join('; ');
  }
}

export const isNotFound = (error: unknown): boolean => error instanceof ApiError && error.status === 404;

/**
 * A caller token, minted per request and valid for minutes. Deliberately not stored anywhere:
 * there is no refresh problem to solve when the issuer and the caller are the same process.
 *
 * The subject is our own users.id — never Google's — and no role travels in it, because the
 * API resolves venue membership from the database on every request.
 */
const mintCallerToken = (userId: string): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('courte-web')
    .setAudience('courte-api')
    .setIssuedAt()
    .setExpirationTime(`${API_TOKEN_TTL_SECONDS}s`)
    .sign(jwtSecret);

type RequestOptions = {
  /** Present for anything user-scoped; omitted on public reads like court search. */
  userId?: string;
  /** Service-to-service credential, for the identity endpoint only. */
  serviceKey?: boolean;
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Next's fetch cache directives. Reads that must reflect a just-completed write pass 0. */
  revalidate?: number | false;
  requestId?: string;
};

const buildHeaders = async (options: RequestOptions): Promise<Headers> => {
  const headers = new Headers({ accept: 'application/json' });

  if (options.body !== undefined) headers.set('content-type', 'application/json');
  if (options.requestId) headers.set('x-request-id', options.requestId);
  if (options.serviceKey) headers.set('x-service-key', env.API_SERVICE_KEY);
  if (options.userId) headers.set('authorization', `Bearer ${await mintCallerToken(options.userId)}`);

  return headers;
};

/**
 * The single door between the two services. Every read and write goes through here, so
 * timeouts, auth and error translation are decided once rather than at seventy call sites.
 */
export const apiFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const url = `${env.API_BASE_URL}/v1${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: await buildHeaders(options),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      ...(options.revalidate === undefined ? {} : { next: { revalidate: options.revalidate } }),
    });
  } catch (cause) {
    // A dead or slow API is an infrastructure fault, not a domain one. It must not be
    // mistaken for a 4xx the user could fix by editing the form.
    throw new ApiError(503, { code: 'API_UNREACHABLE', message: 'The booking service is unavailable' }, { cause });
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const body: ApiErrorBody =
      payload && typeof payload === 'object' && 'code' in payload
        ? (payload as ApiErrorBody)
        : { code: 'UNKNOWN', message: 'Request failed' };
    throw new ApiError(response.status, body);
  }

  return payload as T;
};
